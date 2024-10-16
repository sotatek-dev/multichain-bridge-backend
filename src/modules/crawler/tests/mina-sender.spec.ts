import { EventLogRepository } from '../../../database/repositories/event-log.repository.js';
import { MultiSignatureRepository } from '../../../database/repositories/multi-signature.repository.js';
import { initModuleTest } from '../../../shared/__test__/base/test.lib.js';
import { SenderMinaBridge } from '../sender.minabridge.js';

let mockEventLogRepository: jest.Mocked<EventLogRepository>;
let mockMultiSignatureRepository: jest.Mocked<MultiSignatureRepository>;
let minaCrawlerService: SenderMinaBridge;
describe('MinaSenderService', () => {
  beforeEach(async () => {
    const { unit, unitRef } = await initModuleTest(SenderMinaBridge);
    minaCrawlerService = unit;
    mockEventLogRepository = unitRef.get(EventLogRepository);
    mockMultiSignatureRepository = unitRef.get(MultiSignatureRepository);
  });

  test('should handle validate signature', async () => {
    // handle create signatures for unlock tx
    mockEventLogRepository.findOneBy.mockResolvedValue({
      id: 1,
      tokenReceivedAddress: 'B62qjM88vh9bmR24QTRqJBurdJ8pWKbuPMtmTohiDtdmQEAdPzsBrif',
      tokenFromAddress: '0x0000000000000000000000000000000000000000',
      receiveAddress: 'B62qjjqzjdv7kGSgWVfNrUwUuyuMjtaJwWKs3DAQjV34MMnJGxSqetH',
      amountReceived: '949999050',
      tip: '0.00798591856295',
      gasFee: '0.000001',
    } as any);
    const result = await minaCrawlerService.handleValidateUnlockTxMina(1);
    expect(result.success).toBeTruthy();
  });
  // this test required a lot of resource to run.
  test.skip('should handle unlock tx', async () => {
    // unlock tx need signatures from validators, they are mocked here
    mockMultiSignatureRepository.findBy.mockResolvedValue([
      {
        id: 1,
        validator: 'B62qk5QZLop9UQoCkj81DRNHmXVLmVn5ccRmng7RrTi4u6ChUUEvUGi',
        signature: `{"r":"24690647453400403758332450940494401756404823719411627023053952454727257551393","s":"8819357926999900450936317724572453724695927191493007320782566669146983775031"}`,
      },
      {
        id: 2,
        validator: 'B62qnXpFWCh3wg1ZjiJgoxYFdiwmnsMCZ313DyWFua6ZYcfSyKH1qYH',
        signature: `{"r":"6835381559187113857327770849771266345736416811575358295982019553788143439512","s":"17326056990020532713419002529880067106114089350239630829930554167773839627109"}`,
      },
      {
        id: 3,
        validator: 'B62qpjFBgyNWv4RAroZTnypqMaYjhqWv7ppduHzoTHhmvwVajho6dPq',
        signature: `{"r":"27156093480048411333328592050876860249455597992175035922293191324710774730790","s":"22991006231865604101278191466025757010691843297536425340981503959281091239228"}`,
      },
    ] as any);
    mockEventLogRepository.findOneBy.mockResolvedValue({
      id: 1,
      tokenReceivedAddress: 'B62qjM88vh9bmR24QTRqJBurdJ8pWKbuPMtmTohiDtdmQEAdPzsBrif',
      tokenFromAddress: '0x0000000000000000000000000000000000000000',
      receiveAddress: 'B62qjjqzjdv7kGSgWVfNrUwUuyuMjtaJwWKs3DAQjV34MMnJGxSqetH',
      amountReceived: '949999050',
      tip: '0.00798591856295',
      gasFee: '0.000001',
    } as any);

    // we just want to check if the tx build is ok, skip sending it.
    jest.spyOn(minaCrawlerService, 'handleSendTxMina').mockResolvedValue({ hash: '0x123' } as any);
    const result = await minaCrawlerService.handleUnlockMina(1);
    expect(result.success).toBeTruthy();
  });
});
