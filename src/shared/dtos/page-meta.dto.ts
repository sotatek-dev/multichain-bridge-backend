import { ApiProperty } from '@nestjs/swagger';

import { PageOptionsDto } from './page-options.dto.js';

export class PageMetaDto {
  @ApiProperty({ example: 30 })
  readonly total?: number;

  @ApiProperty({ example: 10 })
  readonly perPage?: number;

  @ApiProperty({ example: 3 })
  readonly totalOfPages?: number;

  @ApiProperty({ example: 1 })
  readonly currentPage?: number;

  @ApiProperty({ example: false })
  readonly hasPreviousPage?: boolean;

  @ApiProperty({ example: true })
  readonly hasNextPage?: boolean;

  constructor(pageOptionsDto: PageOptionsDto, itemCount: number) {
    this.total = itemCount;
    this.totalOfPages = Math.ceil(this.total / pageOptionsDto.limit);
    this.perPage = pageOptionsDto.limit;
    this.currentPage = pageOptionsDto.page;
    this.hasPreviousPage = pageOptionsDto.page > 1;
    this.hasNextPage = pageOptionsDto.page < this.totalOfPages;
  }
}
