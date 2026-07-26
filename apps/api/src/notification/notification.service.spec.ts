import { NotificationService } from './notification.service';

function queryResult(result: { data: unknown; error: unknown }) {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    then: (resolve: (value: unknown) => void) => resolve(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

describe('NotificationService recipient resolution', () => {
  it('returns an explicit user without querying membership', async () => {
    const from = jest.fn();
    const service = new NotificationService({ admin: { from } } as never);
    await expect(service.resolveRecipients({ orgId: 'org-1', userId: 'u1' })).resolves.toEqual(['u1']);
    expect(from).not.toHaveBeenCalled();
  });

  it('resolves and deduplicates organization members by role', async () => {
    const query = queryResult({ data: [{ user_id: 'u1' }, { user_id: 'u1' }, { user_id: 'u2' }], error: null });
    const from = jest.fn().mockReturnValue(query);
    const service = new NotificationService({ admin: { from } } as never);
    await expect(service.resolveRecipients({ orgId: 'org-1', role: 'owner' })).resolves.toEqual(['u1', 'u2']);
    expect(from).toHaveBeenCalledWith('organization_members');
    expect(query.eq).toHaveBeenNthCalledWith(1, 'organization_id', 'org-1');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'role', 'owner');
  });

  it('normalizes lookup failures', async () => {
    const query = queryResult({ data: null, error: { message: 'database unavailable' } });
    const service = new NotificationService({ admin: { from: jest.fn().mockReturnValue(query) } } as never);
    await expect(service.resolveRecipients({ orgId: 'org-1', role: 'owner' })).rejects.toThrow('Recipient lookup failed: database unavailable');
  });

  it('returns an existing notification for the same idempotency key', async () => {
    const query = {
      select: jest.fn(),
      eq: jest.fn(),
      contains: jest.fn(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'existing-notification' }, error: null }),
      insert: jest.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.contains.mockReturnValue(query);
    const service = new NotificationService({ admin: { from: jest.fn().mockReturnValue(query) } } as never);

    await expect(service.notify({
      userId: 'u1', orgId: 'org-1', type: 'system', title: 'Once', idempotencyKey: 'run-1:node-1:u1',
    })).resolves.toBe('existing-notification');
    expect(query.contains).toHaveBeenCalledWith('metadata', { idempotencyKey: 'run-1:node-1:u1' });
    expect(query.insert).not.toHaveBeenCalled();
  });
});
