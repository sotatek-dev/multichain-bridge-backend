import * as path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';

import ormconfig from '../ormconfig';

const workDir = path.basename(path.join(__dirname, '..'));

const options: DataSourceOptions & SeederOptions = {
  ...ormconfig,
  seeds: [`./${workDir}/database/seeds/*.seed{.js,.ts}`],
};
export default new DataSource(options);
