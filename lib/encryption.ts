import CryptoJS from 'crypto-js'

// Получаем ключ шифрования из переменной окружения
const getEncryptionKey = (): string => {
  const key = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET
  if (!key) {
    throw new Error('ENCRYPTION_KEY or JWT_SECRET environment variable is required')
  }
  return key
}

// Шифрование данных
export function encrypt(data: string | object): string {
  try {
    const key = getEncryptionKey()
    const dataString = typeof data === 'string' ? data : JSON.stringify(data)
    const encrypted = CryptoJS.AES.encrypt(dataString, key).toString()
    return encrypted
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

// Дешифрование данных
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey()
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, key)
    const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8)
    
    if (!decryptedData) {
      throw new Error('Failed to decrypt data - invalid key or corrupted data')
    }
    
    return decryptedData
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

// Дешифрование и парсинг JSON
export function decryptJSON<T = any>(encryptedData: string): T {
  try {
    const decrypted = decrypt(encryptedData)
    return JSON.parse(decrypted) as T
  } catch (error) {
    console.error('JSON decryption error:', error)
    throw new Error('Failed to decrypt and parse JSON data')
  }
}

// Утилиты для работы с credentials
export interface PlatformCredentials {
  username?: string
  password?: string
  certificateData?: string
  certificatePassword?: string
  apiKey?: string
  token?: string
  customFields?: Record<string, string>
}

export interface TelegramCredentials {
  botToken: string
  webhookSecret?: string
}

export interface WhatsAppCredentials {
  accessToken: string
  verifyToken?: string
  phoneNumberId: string
  businessAccountId: string
}

export interface EmailCredentials {
  smtpPassword: string
  imapPassword?: string
  oauth2ClientSecret?: string
  oauth2RefreshToken?: string
  oauth2AccessToken?: string
}

// Специализированные функции для шифрования разных типов credentials
export const encryptPlatformCredentials = (credentials: PlatformCredentials): string => {
  return encrypt(credentials)
}

export const decryptPlatformCredentials = (encryptedData: string): PlatformCredentials => {
  return decryptJSON<PlatformCredentials>(encryptedData)
}

export const encryptTelegramCredentials = (credentials: TelegramCredentials): string => {
  return encrypt(credentials)
}

export const decryptTelegramCredentials = (encryptedData: string): TelegramCredentials => {
  return decryptJSON<TelegramCredentials>(encryptedData)
}

export const encryptWhatsAppCredentials = (credentials: WhatsAppCredentials): string => {
  return encrypt(credentials)
}

export const decryptWhatsAppCredentials = (encryptedData: string): WhatsAppCredentials => {
  return decryptJSON<WhatsAppCredentials>(encryptedData)
}

export const encryptEmailCredentials = (credentials: EmailCredentials): string => {
  return encrypt(credentials)
}

export const decryptEmailCredentials = (encryptedData: string): EmailCredentials => {
  return decryptJSON<EmailCredentials>(encryptedData)
}
