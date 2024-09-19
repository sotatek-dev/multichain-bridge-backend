import { Repository, SelectQueryBuilder } from 'typeorm';

import { EDirection } from '../constants/api.constant.js';
import { ETableName } from '../constants/entity.constant.js';

import { IPagination } from '../shared/interfaces/pagination.interface.js';

export abstract class BaseRepository<E> extends Repository<E> {
  protected abstract alias: ETableName;

  protected createQb() {
    return this.createQueryBuilder(this.alias);
  }

  protected queryBuilderAddPagination(
    queryBuilder: SelectQueryBuilder<E>,
    data: Partial<IPagination>,
    selections?: string[],
  ): SelectQueryBuilder<E> {
    if (typeof data !== 'object') {
      return queryBuilder;
    }
    if (data.limit && data.useLimit) {
      queryBuilder.limit(data.limit);
    } else if (data.limit) {
      queryBuilder.take(data.limit);
    }
    if (data.page && data.useLimit) {
      queryBuilder.offset((data.page - 1) * data.limit);
    } else if (data.page) {
      queryBuilder.skip((data.page - 1) * data.limit);
    }
    if (data.sortBy) {
      if (!selections || selections?.includes(`${this.alias}.${data.sortBy}`)) {
        queryBuilder.orderBy(`${this.alias}.${data.sortBy}`, data.direction || EDirection.ASC);
      }
    }
    return queryBuilder;
  }

  protected queryBuilderAddPaginationRaw(
    queryBuilder: SelectQueryBuilder<E>,
    data: Partial<IPagination>,
    selections?: string[],
  ): SelectQueryBuilder<E> {
    if (typeof data !== 'object') {
      return queryBuilder;
    }

    if (data.limit) {
      queryBuilder.limit(data.limit);
    }

    if (data.page) {
      queryBuilder.offset((data.page - 1) * data.limit);
    }

    if (data.sortBy) {
      if (!selections || selections?.includes(`${this.alias}.${data.sortBy}`)) {
        queryBuilder.orderBy(`${this.alias}.${data.sortBy}`, data.direction || EDirection.ASC);
      }
    }

    return queryBuilder;
  }

  protected queryBuilderAddGroupBy(queryBuilder: SelectQueryBuilder<E>, fields: string[]) {
    fields.forEach((field, index) => {
      if (index === 0) {
        queryBuilder.groupBy(field);
      } else {
        queryBuilder.addGroupBy(field);
      }
    });

    return queryBuilder;
  }
}
