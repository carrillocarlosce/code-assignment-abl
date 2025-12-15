import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  HourlyAverage,
  HourlyAverageDocument,
} from './hourly-average.schema';

@Injectable()
export class HourlyAverageRepository {
  constructor(
    @InjectModel(HourlyAverage.name)
    private hourlyAverageModel: Model<HourlyAverageDocument>,
  ) {}

  async save(input: {
    pair: string;
    hour: Date;
    average: number;
    count: number;
  }): Promise<HourlyAverageDocument> {
    // Use upsert to update if exists, insert if not
    return this.hourlyAverageModel.findOneAndUpdate(
      { pair: input.pair, hour: input.hour },
      {
        pair: input.pair,
        hour: input.hour,
        average: input.average,
        count: input.count,
      },
      { upsert: true, new: true },
    );
  }

  async getLatest(pair: string): Promise<HourlyAverageDocument | null> {
    return this.hourlyAverageModel
      .findOne({ pair })
      .sort({ hour: -1 })
      .limit(1)
      .exec();
  }

  async findByPairAndDateRange(
    pair: string,
    startDate: Date,
    endDate: Date,
  ): Promise<HourlyAverageDocument[]> {
    return this.hourlyAverageModel
      .find({
        pair,
        hour: { $gte: startDate, $lte: endDate },
      })
      .sort({ hour: 1 })
      .exec();
  }
}
