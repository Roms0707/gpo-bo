import { supabase } from '../lib/supabase';

export interface DiscordHealthcheckResult {
  success: boolean;
  message: string;
  errorCode?: string;
  guildName?: string;
}

export function isValidDiscordUrl(url: string): boolean {
  if (!url) return true;
  return url.startsWith('https://discord.gg/') || url.startsWith('https://discord.com/invite/');
}

export function isValidDiscordServerId(serverId: string): boolean {
  if (!serverId) return true;
  return /^\d{17,20}$/.test(serverId);
}

export interface DiscordValidationResult {
  isValid: boolean;
  urlError?: string;
  serverIdError?: string;
}

export function validateDiscordConfig(url: string, serverId: string): DiscordValidationResult {
  const result: DiscordValidationResult = { isValid: true };

  if (url && !isValidDiscordUrl(url)) {
    result.isValid = false;
    result.urlError = 'Invalid Discord URL. Use https://discord.gg/... or https://discord.com/invite/...';
  }

  if (serverId && !isValidDiscordServerId(serverId)) {
    result.isValid = false;
    result.serverIdError = 'Invalid Server ID format. It should be a 17-20 digit number.';
  }

  if (url && !serverId) {
    result.isValid = false;
    result.serverIdError = 'Server ID is required when Discord URL is provided.';
  }

  return result;
}

export async function testDiscordConfiguration(discordServerId: string): Promise<DiscordHealthcheckResult> {
  try {
    if (!discordServerId) {
      return {
        success: false,
        message: 'Discord Server ID is required',
        errorCode: 'MISSING_SERVER_ID',
      };
    }

    if (!isValidDiscordServerId(discordServerId)) {
      return {
        success: false,
        message: 'Invalid Discord Server ID format. It should be a 17-20 digit number.',
        errorCode: 'INVALID_SERVER_ID_FORMAT',
      };
    }

    const { data, error } = await supabase.functions.invoke('discord-healthcheck', {
      body: { discord_server_id: discordServerId },
    });

    if (error) {
      console.error('Discord healthcheck invocation error:', error);
      return {
        success: false,
        message: 'Failed to connect to Discord verification service. Please try again.',
        errorCode: 'INVOCATION_ERROR',
      };
    }

    return data as DiscordHealthcheckResult;
  } catch (error) {
    console.error('Discord healthcheck error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again.',
      errorCode: 'UNEXPECTED_ERROR',
    };
  }
}
