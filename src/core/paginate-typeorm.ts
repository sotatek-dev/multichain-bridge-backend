import { Brackets, QueryBuilder } from 'typeorm';

import { PageMetaDto } from '@shared/dtos/page-meta.dto';
import { PageOptionsDto } from '@shared/dtos/page-options.dto';
import { PageDto } from '@shared/dtos/page.dto';
import { transformQuery } from '@shared/utils/transform-query';

declare global {
  interface Array<T> {
    toPageDto<Dto>(this: T[], pageMetaDto: PageOptionsDto, itemCount: number): PageDto<Dto>;
  }
}

declare module 'typeorm' {
  interface QueryBuilder<Entity> {
    searchByString(q: string, columnNames: string[]): this;
  }
}

Array.prototype.toPageDto = function (pageMetaDto: PageOptionsDto, itemCount: number) {
  return new PageDto(this, new PageMetaDto(pageMetaDto, itemCount));
};

QueryBuilder.prototype.searchByString = function (q, columnNames) {
  if (!q) {
    return this;
  }

  this.andWhere(
    new Brackets(qb => {
      for (const item of columnNames) {
        qb.orWhere(`LOWER(${item}) LIKE :q`);
      }
    }),
  );

  this.setParameter('q', `%${transformQuery(q.toString())}%`);

  return this;
};
