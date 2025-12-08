import { useState } from 'react';
import { FileText } from 'lucide-react';
import Card from '../ui/Card';
import Select from '../ui/Select';

interface LegalVariablesPreviewProps {
  supportEmail: string;
  legalEmail: string;
  privacyEmail: string;
  companyName: string;
  companyAddress: string;
  phoneNumber: string;
  registrationNumber: string;
}

type DocumentType = 'terms' | 'privacy' | 'cookies';

const DOCUMENT_TEMPLATES: Record<DocumentType, { title: string; template: string }> = {
  terms: {
    title: 'Terms of Service',
    template: `TERMS OF SERVICE

Last Updated: [Current Date]

1. ACCEPTANCE OF TERMS

By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement.

2. COMPANY INFORMATION

This service is operated by {{COMPANY_NAME}}, a company registered under registration number {{REGISTRATION_NUMBER}}.

Registered Address: {{COMPANY_ADDRESS}}
Phone: {{PHONE_NUMBER}}

3. CONTACT INFORMATION

For general support inquiries, please contact us at {{SUPPORT_EMAIL}}.
For legal matters, please contact our legal department at {{LEGAL_EMAIL}}.
For privacy-related concerns, please contact us at {{PRIVACY_EMAIL}}.

4. SERVICE DESCRIPTION

[Service description would go here...]

5. USER OBLIGATIONS

[User obligations would go here...]

6. INTELLECTUAL PROPERTY

All content, trademarks, and other intellectual property on this service are owned by {{COMPANY_NAME}} or our licensors.

7. LIMITATION OF LIABILITY

{{COMPANY_NAME}} shall not be liable for any indirect, incidental, special, consequential or punitive damages.

8. GOVERNING LAW

These terms shall be governed by and construed in accordance with the laws applicable to {{COMPANY_NAME}}.

9. CONTACT US

If you have any questions about these Terms, please contact us at {{LEGAL_EMAIL}}.`,
  },
  privacy: {
    title: 'Privacy Policy',
    template: `PRIVACY POLICY

Last Updated: [Current Date]

1. INTRODUCTION

{{COMPANY_NAME}} ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.

2. COMPANY INFORMATION

Company Name: {{COMPANY_NAME}}
Registration Number: {{REGISTRATION_NUMBER}}
Address: {{COMPANY_ADDRESS}}
Phone: {{PHONE_NUMBER}}

3. INFORMATION WE COLLECT

[Information collection details would go here...]

4. HOW WE USE YOUR INFORMATION

[Usage details would go here...]

5. DATA SECURITY

We implement appropriate technical and organizational measures to protect your personal data.

6. YOUR RIGHTS

You have the right to access, correct, or delete your personal information. To exercise these rights, please contact us at {{PRIVACY_EMAIL}}.

7. CONTACT US

For any privacy-related questions or concerns:
- Email: {{PRIVACY_EMAIL}}
- Phone: {{PHONE_NUMBER}}
- Address: {{COMPANY_ADDRESS}}

For general support: {{SUPPORT_EMAIL}}
For legal inquiries: {{LEGAL_EMAIL}}

8. DATA CONTROLLER

The data controller responsible for your personal data is {{COMPANY_NAME}}, registration number {{REGISTRATION_NUMBER}}.`,
  },
  cookies: {
    title: 'Cookie Policy',
    template: `COOKIE POLICY

Last Updated: [Current Date]

1. ABOUT THIS POLICY

This Cookie Policy explains how {{COMPANY_NAME}} uses cookies and similar technologies on our service.

2. COMPANY INFORMATION

{{COMPANY_NAME}}
Registration Number: {{REGISTRATION_NUMBER}}
Address: {{COMPANY_ADDRESS}}
Phone: {{PHONE_NUMBER}}

3. WHAT ARE COOKIES

Cookies are small text files that are placed on your device when you visit our service.

4. TYPES OF COOKIES WE USE

[Cookie types would go here...]

5. MANAGING COOKIES

You can control and manage cookies in various ways. Please keep in mind that removing or blocking cookies can impact your user experience.

6. CONTACT US

If you have any questions about our use of cookies:
- Email: {{PRIVACY_EMAIL}}
- Phone: {{PHONE_NUMBER}}
- Address: {{COMPANY_ADDRESS}}

For general support: {{SUPPORT_EMAIL}}
For legal matters: {{LEGAL_EMAIL}}

This Cookie Policy is provided by {{COMPANY_NAME}}, company registration number {{REGISTRATION_NUMBER}}.`,
  },
};

export function LegalVariablesPreview({
  supportEmail,
  legalEmail,
  privacyEmail,
  companyName,
  companyAddress,
  phoneNumber,
  registrationNumber,
}: LegalVariablesPreviewProps) {
  const [selectedDocument, setSelectedDocument] = useState<DocumentType>('terms');

  const replaceVariables = (template: string): string => {
    return template
      .replace(/{{SUPPORT_EMAIL}}/g, supportEmail || '[SUPPORT EMAIL]')
      .replace(/{{LEGAL_EMAIL}}/g, legalEmail || '[LEGAL EMAIL]')
      .replace(/{{PRIVACY_EMAIL}}/g, privacyEmail || '[PRIVACY EMAIL]')
      .replace(/{{COMPANY_NAME}}/g, companyName || '[COMPANY NAME]')
      .replace(/{{COMPANY_ADDRESS}}/g, companyAddress || '[COMPANY ADDRESS]')
      .replace(/{{PHONE_NUMBER}}/g, phoneNumber || '[PHONE NUMBER]')
      .replace(/{{REGISTRATION_NUMBER}}/g, registrationNumber || '[REGISTRATION NUMBER]');
  };

  const highlightReplacedVariables = (text: string): JSX.Element[] => {
    const variables = [
      { placeholder: '[SUPPORT EMAIL]', value: supportEmail },
      { placeholder: '[LEGAL EMAIL]', value: legalEmail },
      { placeholder: '[PRIVACY EMAIL]', value: privacyEmail },
      { placeholder: '[COMPANY NAME]', value: companyName },
      { placeholder: '[COMPANY ADDRESS]', value: companyAddress },
      { placeholder: '[PHONE NUMBER]', value: phoneNumber },
      { placeholder: '[REGISTRATION NUMBER]', value: registrationNumber },
    ];

    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    let keyCounter = 0;

    variables.forEach((variable) => {
      const regex = new RegExp(
        variable.value
          ? variable.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          : variable.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'g'
      );

      let match;
      const workingText = text;
      const tempParts: { start: number; end: number; text: string; highlight: boolean }[] = [];

      while ((match = regex.exec(workingText)) !== null) {
        tempParts.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          highlight: true,
        });
      }

      tempParts.sort((a, b) => a.start - b.start);
    });

    const allMatches: { index: number; length: number; value: string }[] = [];

    variables.forEach((variable) => {
      const searchValue = variable.value || variable.placeholder;
      const regex = new RegExp(searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      let match;

      while ((match = regex.exec(text)) !== null) {
        allMatches.push({
          index: match.index,
          length: match[0].length,
          value: match[0],
        });
      }
    });

    allMatches.sort((a, b) => a.index - b.index);

    allMatches.forEach((match) => {
      if (lastIndex < match.index) {
        parts.push(<span key={`text-${keyCounter++}`}>{text.slice(lastIndex, match.index)}</span>);
      }

      const hasValue = variables.some((v) => v.value && match.value === v.value);

      parts.push(
        <span
          key={`highlight-${keyCounter++}`}
          className={hasValue ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-1 rounded' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-1 rounded'}
        >
          {match.value}
        </span>
      );

      lastIndex = match.index + match.length;
    });

    if (lastIndex < text.length) {
      parts.push(<span key={`text-${keyCounter++}`}>{text.slice(lastIndex)}</span>);
    }

    return parts;
  };

  const currentTemplate = DOCUMENT_TEMPLATES[selectedDocument];
  const replacedText = replaceVariables(currentTemplate.template);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Legal Document Preview
          </h3>
        </div>
        <Select
          value={selectedDocument}
          onChange={(e) => setSelectedDocument(e.target.value as DocumentType)}
          className="w-48"
        >
          <option value="terms">Terms of Service</option>
          <option value="privacy">Privacy Policy</option>
          <option value="cookies">Cookie Policy</option>
        </Select>
      </div>

      <div className="mb-3 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 bg-green-100 dark:bg-green-900/30 rounded"></span>
          <span className="text-gray-600 dark:text-gray-400">Filled values</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 bg-yellow-100 dark:bg-yellow-900/30 rounded"></span>
          <span className="text-gray-600 dark:text-gray-400">Missing values</span>
        </div>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 max-h-96 overflow-y-auto">
        <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
          {highlightReplacedVariables(replacedText)}
        </pre>
      </div>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Tip:</strong> The highlighted text shows where your legal variables will appear in actual legal documents.
          Green highlights indicate filled values, while yellow highlights show placeholders for missing information.
        </p>
      </div>
    </Card>
  );
}
