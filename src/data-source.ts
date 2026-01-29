import 'reflect-metadata';
import { AppDataSource } from './ormconfig';

// Re-export the configured DataSource so it is included in the compiled `dist/` folder
// when running `npm run build`. The migration JS scripts point to `dist/data-source.js`.
export default AppDataSource;
