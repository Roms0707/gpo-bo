// Country data with flags and phone dial codes
export const countries = [
  { value: 'BF', label: 'Burkina Faso', flag: '🇧🇫', dialCode: '+226', format: 'XX XX XX XX' },
  { value: 'BJ', label: 'Bénin', flag: '🇧🇯', dialCode: '+229', format: 'XX XX XX XX' },
  { value: 'BW', label: 'Botswana', flag: '🇧🇼', dialCode: '+267', format: 'XX XXX XXX' },
  { value: 'CD', label: 'République démocratique du Congo', flag: '🇨🇩', dialCode: '+243', format: 'XX XXX XXXX' },
  { value: 'CF', label: 'République centrafricaine', flag: '🇨🇫', dialCode: '+236', format: 'XX XX XX XX' },
  { value: 'CI', label: 'Côte d\'Ivoire', flag: '🇨🇮', dialCode: '+225', format: 'XX XX XX XX XX' },
  { value: 'CM', label: 'Cameroun', flag: '🇨🇲', dialCode: '+237', format: 'X XX XX XX XX' },
  { value: 'EG', label: 'Égypte', flag: '🇪🇬', dialCode: '+20', format: 'XXX XXX XXXX' },
  { value: 'ET', label: 'Éthiopie', flag: '🇪🇹', dialCode: '+251', format: 'XX XXX XXXX' },
  { value: 'GA', label: 'Gabon', flag: '🇬🇦', dialCode: '+241', format: 'X XX XX XX' },
  { value: 'GH', label: 'Ghana', flag: '🇬🇭', dialCode: '+233', format: 'XX XXX XXXX' },
  { value: 'GN', label: 'Guinée', flag: '🇬🇳', dialCode: '+224', format: 'XX XX XX XX' },
  { value: 'GW', label: 'Guinée-Bissau', flag: '🇬🇼', dialCode: '+245', format: 'XXX XXXX' },
  { value: 'JO', label: 'Jordanie', flag: '🇯🇴', dialCode: '+962', format: 'X XXXX XXXX' },
  { value: 'LR', label: 'Libéria', flag: '🇱🇷', dialCode: '+231', format: 'XX XXX XXXX' },
  { value: 'MA', label: 'Maroc', flag: '🇲🇦', dialCode: '+212', format: 'XX XXX XXXX' },
  { value: 'MG', label: 'Madagascar', flag: '🇲🇬', dialCode: '+261', format: 'XX XX XXX XX' },
  { value: 'ML', label: 'Mali', flag: '🇲🇱', dialCode: '+223', format: 'XX XX XX XX' },
  { value: 'SL', label: 'Sierra Leone', flag: '🇸🇱', dialCode: '+232', format: 'XX XXXXXX' },
  { value: 'SN', label: 'Sénégal', flag: '🇸🇳', dialCode: '+221', format: 'XX XXX XX XX' },
  { value: 'TG', label: 'Togo', flag: '🇹🇬', dialCode: '+228', format: 'XX XX XX XX' },
  { value: 'TN', label: 'Tunisie', flag: '🇹🇳', dialCode: '+216', format: 'XX XXX XXX' }
];

export interface Country {
  value: string;
  label: string;
  flag: string;
  dialCode: string;
  format: string;
}
