import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HourlyAverageDocument = HourlyAverage & Document;

@Schema({ timestamps: true })
export class HourlyAverage {
  @Prop({ required: true, index: true })
  pair: string;

  @Prop({ required: true, index: true })
  hour: Date;

  @Prop({ required: true })
  average: number;

  @Prop({ required: true })
  count: number;
}

export const HourlyAverageSchema = SchemaFactory.createForClass(HourlyAverage);

// Create compound index for efficient queries
HourlyAverageSchema.index({ pair: 1, hour: -1 }, { unique: true });

