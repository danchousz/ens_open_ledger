import { Storage } from '@google-cloud/storage';

const storage = new Storage({
    projectId: 'ens-legal-invoices',
    keyFilename: './config/gsc/gcs-key.json'
});

const bucketName = 'invoices_ens_ledger';
const bucket = storage.bucket(bucketName);

export { bucket, bucketName };