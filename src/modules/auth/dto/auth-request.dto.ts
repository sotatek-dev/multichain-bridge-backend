import { ObjectField, StringField } from '../../../shared/decorators/field.decorator.js';

export class SignupDto {
  @StringField({
    required: true,
    isEmail: true,
    example: 'name@mail.com',
  })
  email: string;

  @StringField({
    required: true,
    example: 'ABC@123',
  })
  password: string;
}

export class LoginDto {
  @StringField({
    required: true,
  })
  address: string;

  @StringField({
    required: true,
  })
  signature: string;
}

export class MinaSignatureDto {
  @StringField({
    required: true,
    example: '13103062255371554830871806571266501056569826727061194167717383802935285095667',
  })
  field: string;

  @StringField({
    required: true,
    example: '8184099996718391251128744530931690607354984861474783138892757893603123747186',
  })
  scalar: string;
}
export class LoginMinaDto {
  @StringField({
    required: true,
    example: 'B62qph8sAdxKn1JChJRLzCWek7kkdi8QPLWdfhpFEMDNbM4Ficpradb',
  })
  address: string;

  @ObjectField({
    required: true,
    type: MinaSignatureDto,
  })
  signature: MinaSignatureDto;
}

export class RefreshTokenRequestDto {
  @StringField({
    required: true,
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwicm9sZSI6InVzZXIifQ.iFGDbsCMdIiMRVr2g4oaG6_9wDGi9wkjPNEAnLsPmyU',
  })
  refreshToken: string;
}
