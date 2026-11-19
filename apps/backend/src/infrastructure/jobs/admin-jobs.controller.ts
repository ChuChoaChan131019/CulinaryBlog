import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminJobsQueryDto } from './admin-jobs-query.dto';
import { JobsDashboardService } from './jobs-dashboard.service';

@ApiTags('admin-jobs')
@ApiBearerAuth()
@Controller('admin/jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
export class AdminJobsController {
  constructor(private readonly jobs: JobsDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy thống kê các hàng đợi job (Admin)' })
  getSummaries() {
    return this.jobs.getSummaries();
  }

  @Get('all')
  @ApiOperation({ summary: 'Lấy danh sách job từ tất cả hàng đợi (Admin)' })
  getAllJobs(@Query() query: AdminJobsQueryDto) {
    return this.jobs.getAllJobs(query.state, query.page, query.pageSize);
  }

  @Get(':queueName')
  @ApiOperation({ summary: 'Lấy danh sách job theo hàng đợi và trạng thái (Admin)' })
  getJobs(@Param('queueName') queueName: string, @Query() query: AdminJobsQueryDto) {
    return this.jobs.getJobs(queueName, query.state, query.page, query.pageSize);
  }

  @Post(':queueName/:jobId/retries')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Chạy lại job thất bại (Admin)' })
  retryFailedJob(@Param('queueName') queueName: string, @Param('jobId') jobId: string): Promise<void> {
    return this.jobs.retryFailedJob(queueName, jobId);
  }
}
