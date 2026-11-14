import os from 'node:os';
import path from 'node:path';
export const home=path.resolve(process.env.WE_TEMPLATE_HOME || path.join(os.homedir(),'.we-template'));
