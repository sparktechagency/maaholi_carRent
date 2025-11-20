import { BrandsI } from "../app/modules/subCategory-Brand-Model/subCategory.interface";

interface PaginationOptions {
  page: number;
  limit: number;
  searchTerm: string;
  categoryId: string;
}

interface PaginatedResult {
  subCategories: BrandsI[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}

export { PaginationOptions, PaginatedResult };