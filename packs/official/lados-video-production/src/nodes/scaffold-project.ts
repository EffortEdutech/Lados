/**
 * lados.video.scaffold_project
 *
 * Records the Remotion starter template chosen for a video project (Part 5
 * of the blueprint: Hello World / 3D / adaptive). This node is bookkeeping
 * only — the actual `npx create-video@latest` scaffold and Chrome preview
 * are run in the connected Claude session, not by this workflow engine.
 *
 * Config/Inputs:
 *   projectName — required, human-readable project name
 *   template    — 'hello-world' | '3d' | 'adaptive' (default: 'adaptive')
 *   folderPath  — optional local project folder path, carried through for reference
 *
 * Outputs:
 *   project — { projectName, template, folderPath }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

const VALID_TEMPLATES = ['hello-world', '3d', 'adaptive'] as const;
type Template = (typeof VALID_TEMPLATES)[number];

export async function scaffoldProject(ctx: NodeContext): Promise<NodeExecuteResult> {
  const cfg = ctx.config as Record<string, unknown>;
  const inp = ctx.inputs as Record<string, unknown>;

  const projectName = (inp['projectName'] ?? cfg['projectName']) as string | undefined;
  const templateRaw = ((inp['template'] ?? cfg['template']) as string | undefined) ?? 'adaptive';
  const folderPath = (inp['folderPath'] ?? cfg['folderPath']) as string | undefined;

  if (!projectName) {
    return {
      status: 'failure',
      outputs: {},
      error: { code: 'MISSING_INPUT', message: 'lados.video.scaffold_project: projectName is required' },
    };
  }

  if (!VALID_TEMPLATES.includes(templateRaw as Template)) {
    return {
      status: 'failure',
      outputs: {},
      error: {
        code: 'INVALID_TEMPLATE',
        message: `lados.video.scaffold_project: template must be one of ${VALID_TEMPLATES.join(', ')}, got "${templateRaw}"`,
      },
    };
  }

  ctx.logger.info(`lados.video.scaffold_project: "${projectName}" using template "${templateRaw}"`);

  return {
    status: 'success',
    outputs: { project: { projectName, template: templateRaw, folderPath: folderPath ?? null } },
    summary: `Project "${projectName}" scaffolded with the ${templateRaw} template`,
  };
}
