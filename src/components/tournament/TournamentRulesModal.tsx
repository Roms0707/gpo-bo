import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Save, AlertTriangle } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './TournamentRulesModal.css';

interface TournamentRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  initialRules: string | null;
  onSave: (rules: string) => Promise<void>;
  isLoading?: boolean;
}

const TournamentRulesModal: React.FC<TournamentRulesModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  initialRules,
  onSave,
  isLoading = false
}) => {
  const [rules, setRules] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRules(initialRules || '');
      setHasChanges(false);
    }
  }, [isOpen, initialRules]);

  const handleRulesChange = (content: string) => {
    setRules(content);
    setHasChanges(content !== initialRules);
  };

  const handleSave = async () => {
    await onSave(rules);
    setHasChanges(false);
  };

  // Rich text editor modules and formats
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'font',
    'align',
    'list', 'bullet',
    'blockquote', 'code-block',
    'link'
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (hasChanges) {
          if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
            onClose();
          }
        } else {
          onClose();
        }
      }}
      title="Tournament Rules"
      size="2xl"
      footer={
        <div className="flex justify-between w-full">
          <div className="flex items-center">
            {hasChanges && (
              <span className="text-warning-400 text-sm flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              isLoading={isLoading}
              disabled={!hasChanges || isLoading}
              leftIcon={<Save size={16} />}
            >
              Save Rules
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Define the rules for this tournament. These rules will be visible to all participants.
        </p>

        <div className="bg-white rounded-md">
          <ReactQuill
            theme="snow"
            value={rules}
            onChange={handleRulesChange}
            modules={quillModules}
            formats={quillFormats}
            style={{
              height: '400px',
              marginBottom: '50px',
              borderRadius: '0.375rem'
            }}
          />
        </div>

        <div className="bg-dark-200 p-3 rounded-md text-sm text-gray-400">
          <p>
            <strong>Tips:</strong>
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Use headings to organize different sections of your rules</li>
            <li>Include information about match formats, scoring, and tie-breakers</li>
            <li>Specify any prohibited actions or behaviors</li>
            <li>Detail the process for disputes or rule violations</li>
            <li>Include contact information for tournament administrators</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default TournamentRulesModal;
