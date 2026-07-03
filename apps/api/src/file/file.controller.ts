/**
 * FileController
 *
 * POST /uploads — upload a file (multipart/form-data)
 * GET  /uploads/:fileId — get upload metadata
 */
import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseJwtGuard as JwtAuthGuard } from '../common/guards/supabase-jwt.guard';
import { SecurityEngineService } from '../security/security.service';
import { FileService } from './file.service';

const ALLOWED_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel',                                           // .xls
  'text/csv',
  'application/pdf',
  'application/octet-stream',
]);

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class FileController {
  constructor(
    private readonly fileService: FileService,
    private readonly security: SecurityEngineService,
  ) {}

  /**
   * POST /uploads
   * Body: multipart/form-data
   *   file         — the file
   *   organizationId — required
   *   projectId    — optional
   *   workflowId   — optional
   */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('organizationId') organizationId: string,
    @Query('projectId') projectId?: string,
    @Query('workflowId') workflowId?: string,
    @Request() req?: { user: { id: string } },
  ) {
    if (!organizationId) {
      throw new BadRequestException('organizationId is required');
    }
    // PD-3 — caller must be a member of the target org
    await this.security.requireMembership(req!.user.id, organizationId);
    if (!file) {
      throw new BadRequestException('No file attached — use multipart/form-data with field name "file"');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(`File type "${file.mimetype}" not allowed. Upload .xlsx, .xls, .csv, or .pdf`);
    }

    const result = await this.fileService.uploadFile(
      file,
      organizationId,
      req!.user.id,
      projectId,
      workflowId,
    );

    return { success: true, data: result };
  }

  /** GET /uploads/:fileId */
  @Get(':fileId')
  async getUpload(
    @Param('fileId') fileId: string,
    @Request() req: { user: { id: string } },
  ) {
    const upload = await this.fileService.getUpload(fileId);
    // PD-3 — previously ANY authenticated user could read ANY upload's
    // metadata by id. Verify membership of the upload's own org.
    const orgId = (upload as { organization_id?: string }).organization_id;
    if (orgId) await this.security.requireMembership(req.user.id, orgId);
    return { success: true, data: upload };
  }
}
