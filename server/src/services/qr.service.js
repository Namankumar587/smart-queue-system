import QRCode from 'qrcode';

export const generateQRCodeDataURL = async (text) => {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    });
    return dataUrl;
  } catch (error) {
    console.error('[QR Service] Failed to generate QR Code:', error.message);
    throw new Error('QR Code generation failed');
  }
};
