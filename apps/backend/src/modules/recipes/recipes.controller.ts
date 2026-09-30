import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { PagedResult, RecipeSummaryDto } from '@culinary/shared';
import type { Response } from 'express';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateRecipeCommand } from './commands/create-recipe.command';
import { PublishRecipeCommand } from './commands/publish-recipe.command';
import { UnpublishRecipeCommand } from './commands/unpublish-recipe.command';
import { UpdateRecipeCommand } from './commands/update-recipe.command';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { RecipeDto } from './dto/recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import {
  GetRecipesQueryDto,
  GetRecipesQueryParams,
} from './dto/get-recipes-query.dto';
import { GetRecipesQuery } from './queries/get-recipes.query';
import { RecipeImagesService } from '../media/recipe-images.service';
import { UploadFile, MAX_FILE_SIZE } from '../media/file-storage.service';
import { FileUploadExceptionInterceptor } from '../media/file-upload-exception.interceptor';

@ApiTags('recipes')
@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly recipeImages: RecipeImagesService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  getRecipes(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query(
      new ValidationPipe({
        expectedType: GetRecipesQueryDto,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
        whitelist: true,
      }),
    )
    query: GetRecipesQueryParams,
  ): Promise<PagedResult<RecipeSummaryDto>> {
    return this.queryBus.execute(new GetRecipesQuery(query, user));
  }

  @Post(':id/images')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  @UseInterceptors(
    new FileUploadExceptionInterceptor(),
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }),
  )
  uploadImage(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: UploadFile | undefined,
    @Body('altText') altText?: string,
  ) {
    if (!file) {
      throw new BadRequestException({ type: 'VALIDATION_ERROR', detail: 'A file is required.' });
    }
    return this.recipeImages.upload(id, user, file, altText);
  }

  @Patch(':id/images/:imageId/primary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  setPrimaryImage(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string,
    @Param('imageId', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) imageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipeImages.setPrimary(id, imageId, user);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  async deleteImage(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string,
    @Param('imageId', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) imageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.recipeImages.remove(id, imageId, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRecipeDto,
  ): Promise<RecipeDto> {
    return this.commandBus.execute(
      new CreateRecipeCommand(
        user.id,
        dto.title,
        dto.description,
        dto.categoryId,
        dto.prepTime,
        dto.cookTime,
        dto.servings,
        dto.difficulty,
        dto.instructions,
        dto.nutrition,
        dto.steps,
        dto.ingredients,
      ),
    );
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  async publish(
    @Param(
      'id',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RecipeDto> {
    const result = await this.commandBus.execute<
      PublishRecipeCommand,
      RecipeDto
    >(new PublishRecipeCommand(id, user));

    response.setHeader('ETag', `"${result.rowVersion}"`);
    return result;
  }

  @Patch(':id/unpublish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  async unpublish(
    @Param(
      'id',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RecipeDto> {
    const result = await this.commandBus.execute<
      UnpublishRecipeCommand,
      RecipeDto
    >(new UnpublishRecipeCommand(id, user));

    response.setHeader('ETag', `"${result.rowVersion}"`);
    return result;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'If-Match',
    required: true,
    description: 'Row version hiện tại, ví dụ: "3"',
  })
  async update(
    @Param(
      'id',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() dto: UpdateRecipeDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RecipeDto> {
    const expectedRowVersion = this.parseIfMatch(ifMatch);
    const result = await this.commandBus.execute<
      UpdateRecipeCommand,
      RecipeDto
    >(new UpdateRecipeCommand(id, user, expectedRowVersion, dto));

    response.setHeader('ETag', `"${result.rowVersion}"`);
    return result;
  }

  private parseIfMatch(ifMatch: string | undefined): number {
    const value = ifMatch?.trim();
    const match = value?.match(/^(?:"([1-9]\d*)"|([1-9]\d*))$/);
    const rowVersion = Number(match?.[1] ?? match?.[2]);

    if (!match || !Number.isSafeInteger(rowVersion)) {
      throw new BadRequestException({
        type: 'VALIDATION_ERROR',
        title: 'If-Match không hợp lệ',
        status: 400,
        detail: 'If-Match phải chứa rowVersion là số nguyên dương',
      });
    }

    return rowVersion;
  }
}
