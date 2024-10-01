import { PageMetaDto } from '../shared/dtos/page-meta.dto.js';
import { PageOptionsDto } from '../shared/dtos/page-options.dto.js';
import { PageDto } from '../shared/dtos/page.dto.js';

export function toPageDto(data: any[], pageMetaDto: PageOptionsDto, itemCount: number) {
  return new PageDto(data, new PageMetaDto(pageMetaDto, itemCount));
}
