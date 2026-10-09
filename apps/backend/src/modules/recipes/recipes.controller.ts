import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
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
import {
  PagedResult,
  RecipeSearchResultDto,
  RecipeSummaryDto,
} from '@culinary/shared';
import type { Response } from 'express';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ArchiveRecipeCommand } from './commands/archive-recipe.command';
import { CreateRecipeCommand } from './commands/create-recipe.command';
import { PublishRecipeCommand } from './commands/publish-recipe.command';
import { UnpublishRecipeCommand } from './commands/unpublish-recipe.command';
import { UpdateRecipeCommand } from './commands/update-recipe.command';
import { DeleteRecipeCommand } from './commands/delete-recipe.command';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { RecipeDto } from './dto/recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import {
  GetRecipesQueryDto,
  GetRecipesQueryParams,
} from './dto/get-recipes-query.dto';
import {
  SearchRecipesQueryDto,
  SearchRecipesQueryParams,
} from './dto/search-recipes-query.dto';
import { GetRecipesQuery } from './queries/get-recipes.query';
import { SearchRecipesQuery } from './queries/search-recipes.query';
import { RecipeIngredientsService } from './recipe-ingredients.service';
import {
  CreateRecipeIngredientDto,
  UpdateRecipeIngredientDto,
} from './dto/recipe-ingredient.dto';
import { RecipeIngredientResponseDto } from './dto/recipe.dto';
import { RecipeImagesService } from '../media/recipe-images.service';
import { UploadFile, MAX_FILE_SIZE } from '../media/file-storage.service';
import { FileUploadExceptionInterceptor } from '../media/file-upload-exception.interceptor';
import { RecipeImageUploadService } from './recipe-image-upload.service';
import { RecipeStepsService } from './recipe-steps.service';
import { RecipeDetailsService } from './recipe-details.service';
import { CreateRecipeStepDto, UpdateRecipeStepDto } from './dto/recipe-step.dto';
import { RecipeImageCleanupQueue } from '../../infrastructure/jobs/recipe-image-cleanup.queue';

@ApiTags('recipes')
@Controller('recipes')
export class RecipesController {
  private readonly logger = new Logger(RecipesController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly recipeIngredients: RecipeIngredientsService,
    private readonly recipeImages: RecipeImagesService,
    private readonly recipeImageUpload: RecipeImageUploadService,
    private readonly recipeSteps: RecipeStepsService,
    private readonly recipeDetails: RecipeDetailsService,
    private readonly imageCleanup: RecipeImageCleanupQueue,
  ) {}

  @Get('search')
  search(
    @Query(
      new ValidationPipe({
        expectedType: SearchRecipesQueryDto,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
        whitelist: true,
      }),
    )
    query: SearchRecipesQueryParams,
  ): Promise<PagedResult<RecipeSearchResultDto>> {
    return this.queryBus.execute(new SearchRecipesQuery(query));
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  getBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<RecipeDto> {
    return this.recipeDetails.getBySlug(slug, user);
  }

  @Get(':id/ingredients')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  listIngredients(
    @Param(
      'id',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RecipeIngredientResponseDto[]> {
    return this.recipeIngredients.list(id, user);
  }

  @Post(':id/ingredients')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  createIngredient(
    @Param(
      'id',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: string,
    @Body() dto: CreateRecipeIngredientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipeIngredients.create(id, dto, user);
  }

  @Put(':id/ingredients/:ingredientId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  updateIngredient(
    @Param(
      'id',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: string,
    @Param(
      'ingredientId',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    ingredientId: string,
    @Body() dto: UpdateRecipeIngredientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipeIngredients.update(id, ingredientId, dto, user);
  }

  @Delete(':id/ingredients/:ingredientId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  async deleteIngredient(
    @Param(
      'id',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: string,
    @Param(
      'ingredientId',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    ingredientId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.recipeIngredients.remove(id, ingredientId, user);
  }

  @Get(':id/steps')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  listSteps(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipeSteps.list(id, user);
  }

  @Post(':id/steps')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  createStep(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string,
    @Body() dto: CreateRecipeStepDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipeSteps.create(id, dto, user);
  }

  @Put(':id/steps/:stepId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  updateStep(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string,
    @Param('stepId', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) stepId: string,
    @Body() dto: UpdateRecipeStepDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recipeSteps.update(id, stepId, dto, user);
  }

  @Delete(':id/steps/:stepId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  deleteStep(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: string,
    @Param('stepId', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) stepId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.recipeSteps.remove(id, stepId, user);
  }

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
    @Param(
      'id',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: UploadFile | undefined,
    @Body('altText') altText?: string,
  ) {
    if (!file) {
      throw new BadRequestException({
        type: 'VALIDATION_ERROR',
        detail: 'A file is required.',
      });
    }
    return this.recipeImageUpload.upload(id, user, file, altText);
  }

  @Patch(':id/images/:imageId/primary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  setPrimaryImage(
    @Param(
      'id',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: string,
    @Param(
      'imageId',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    imageId: string,
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
    @Param(
      'id',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: string,
    @Param(
      'imageId',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    imageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const objectKeys = await this.recipeImages.remove(id, imageId, user);

    // The database mutation is the synchronous source of truth. MinIO cleanup
    // runs in BullMQ so a storage outage never blocks the 204 response.
    void this.imageCleanup.enqueue({ recipeId: id, objectKeys }).catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(`Không thể enqueue job xóa ảnh ${imageId}: ${detail}`);
    });
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  async deleteRecipe(
    @Param(
      'id',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute(new DeleteRecipeCommand(id, user));
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

  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  async archive(
    @Param(
      'id',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RecipeDto> {
    const result = await this.commandBus.execute<
      ArchiveRecipeCommand,
      RecipeDto
    >(new ArchiveRecipeCommand(id, user));

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
