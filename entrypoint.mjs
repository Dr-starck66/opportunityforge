const hasAffilhunt = Boolean(String(process.env.APP_GZ_B64 || '').trim());
if (hasAffilhunt) {
  console.log('AFFILHUNT_BOOT_SELECTED');
  await import('./affilhunt-app/bootstrap.mjs');
} else {
  console.log('FREEHOTELS_BOOT_SELECTED');
  await import('./server.mjs');
}
