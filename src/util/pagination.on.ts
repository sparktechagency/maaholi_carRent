export const paginateAndSort = (query: any) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  const sort = query.sort || "-createdAt";

  return { page, limit, skip, sort };
};