import { PageMetaDto } from '@shared/dtos/page-meta.dto';
import { PageOptionsDto } from '@shared/dtos/page-options.dto';
import { PageDto } from '@shared/dtos/page.dto';

export function toPageDto(data: any[], pageMetaDto: PageOptionsDto, itemCount: number) {
  return new PageDto(data, new PageMetaDto(pageMetaDto, itemCount));
}
