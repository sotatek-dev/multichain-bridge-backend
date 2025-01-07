export enum EQueueName {
  EVM_SENDER_QUEUE = 'EVM_SENDER_QUEUE',
  MINA_SENDER_QUEUE = 'MINA_SENDER_QUEUE',
  UNLOCK_JOB_QUEUE = 'UNLOCK_JOB_QUEUE',
}
export const getEvmValidatorQueueName = (index: number) => `EVM_VALIDATOR_${index}`;
export const getMinaValidatorQueueName = (index: number) => `MINA_VALIDATOR_${index}`;

// job priority, lower index is higher priority
export enum EJobPriority {
  DEPLOY_TOKEN,
  UNLOCK,
}
