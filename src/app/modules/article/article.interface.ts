import { Model, Types } from 'mongoose';

export type IArticle = {
  title: string;
  image: string;
  description: string;
};

export type ArticleModel = Model<IArticle>;
