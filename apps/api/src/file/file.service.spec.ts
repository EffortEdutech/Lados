import { FileService } from './file.service';

describe('FileService generated document storage', () => {
  it('stores bytes and persists an upload row with execution provenance', async () => {
    const upload = jest.fn().mockResolvedValue({ error: null });
    const remove = jest.fn().mockResolvedValue({ error: null });
    const single = jest.fn().mockResolvedValue({ data: { id: 'file-generated-1' }, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const supabase = {
      admin: {
        storage: { from: jest.fn(() => ({ upload, remove })) },
        from: jest.fn(() => ({ insert })),
      },
    };
    const service = new FileService(supabase as never);

    const result = await service.saveGeneratedDocument({
      orgId: 'org-1', projectId: 'project-1', workflowId: 'workflow-1', userId: 'user-1',
      fileName: 'Progress Claim.docx', buffer: Buffer.from('docx-bytes'),
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    expect(result).toEqual({ fileId: 'file-generated-1' });
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^org-1\/project-1\/\d+_Progress_Claim\.docx$/),
      expect.any(Buffer),
      expect.objectContaining({ upsert: false }),
    );
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      organization_id: 'org-1', project_id: 'project-1', workflow_id: 'workflow-1', uploaded_by: 'user-1',
    }));
  });

  it('removes stored bytes when metadata persistence fails', async () => {
    const upload = jest.fn().mockResolvedValue({ error: null });
    const remove = jest.fn().mockResolvedValue({ error: null });
    const single = jest.fn().mockResolvedValue({ data: null, error: { message: 'db failed' } });
    const supabase = {
      admin: {
        storage: { from: jest.fn(() => ({ upload, remove })) },
        from: jest.fn(() => ({ insert: () => ({ select: () => ({ single }) }) })),
      },
    };
    const service = new FileService(supabase as never);

    await expect(service.saveGeneratedDocument({
      orgId: 'org-1', projectId: 'project-1', workflowId: 'workflow-1', userId: 'user-1',
      fileName: 'Report.docx', buffer: Buffer.from('docx-bytes'), mimeType: 'application/docx',
    })).rejects.toThrow('Failed to record generated document');
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
