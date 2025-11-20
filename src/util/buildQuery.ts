import { Types } from "mongoose";

/**
 * Universal dynamic search + filter builder
 * - searchFields: ["basicInformation.vehicleName", "location.city", ...]
 * - exactFilters: ["status", "user", "location.country"]
 * - numberFilters: ["basicInformation.year", "basicInformation.miles"]
 */
export const buildQuery = ({
  query = {},
  searchFields = [],
  exactFilters = [],
  numberFilters = [],
}: {
  query?: Record<string, any>;
  searchFields?: string[];
  exactFilters?: string[];
  numberFilters?: string[];
}): Record<string, any> => {
  const {
    search = "",
    ...rest
  } = query;

  const finalQuery: any = { isDeleted: false };

  // -------------------------------
  // 🔍 SEARCH (Regex search)
  // -------------------------------
  if (search && searchFields.length > 0) {
    finalQuery.$or = searchFields.map((field) => ({
      [field]: { $regex: search, $options: "i" },
    }));
  }

  // -------------------------------
  // 🎯 EXACT FILTERS (status, dropdown, enums)
  // -------------------------------
  exactFilters.forEach((field) => {
    if (rest[field]) {
      finalQuery[field] = rest[field];
    }
  });

  // -------------------------------
  // 🔢 NUMBER FILTERS (year, miles, price)
  // -------------------------------
  numberFilters.forEach((field) => {
    if (rest[field] !== undefined) {
      finalQuery[field] = Number(rest[field]);
    }
  });

  // -------------------------------
  // 🆔 ObjectId Filters
  // -------------------------------
  if (rest.userId) {
    finalQuery["user"] = new Types.ObjectId(rest.userId);
  }

  return finalQuery;
};