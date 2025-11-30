import { Schema, model } from 'mongoose';
import { IArticle, ArticleModel } from './article.interface';

const articleSchema = new Schema<IArticle, ArticleModel>(
  {
    title: { type: String, required: true },
    image: { type: String, required: true },
    description: { type: String, required: true },
  },
  { timestamps: true }
);

export const Article = model<IArticle, ArticleModel>('Article', articleSchema);
