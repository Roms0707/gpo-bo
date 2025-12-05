import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Phone, FileText, Calendar, ChevronDown, ListOrdered, CheckSquare } from 'lucide-react';
import { useFieldStore } from '../store/fieldStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Checkbox from '../components/ui/Checkbox';
import FieldTypeCard from '../components/fields/FieldTypeCard';
import DropdownOptionsBuilder from '../components/fields/DropdownOptionsBuilder';

const FieldsPage: React.FC = () => {
  const { fields, fetchFields, createField, updateField, deleteField, isLoading } = useFieldStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  
  // Form state
  const [fieldId, setFieldId] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldDescription, setFieldDescription] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [isRequired, setIsRequired] = useState(false);
  const [displayLocation, setDisplayLocation] = useState('before');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [placeholderText, setPlaceholderText] = useState('');
  const [fieldCategory, setFieldCategory] = useState('custom');
  
  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  // Set form data when editing
  useEffect(() => {
    if (selectedFieldId && isEditModalOpen) {
      const field = fields.find(f => f.id === selectedFieldId);
      if (field) {
        setFieldName(field.name);
        setFieldType(field.field_type);
        setIsRequired(field.required);
        setDropdownOptions(Array.isArray(field.options) ? field.options : []);
        setPlaceholderText(field.placeholder_text || '');
        setFieldCategory(field.field_category || 'custom');
        setDisplayOrder(field.display_order || 1);
      }
    }
  }, [selectedFieldId, isEditModalOpen, fields]);

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();

    await createField({
      name: fieldName,
      field_type: fieldType,
      required: isRequired,
      options: (fieldType === 'select' || fieldType === 'multi-select') && dropdownOptions.length > 0
        ? dropdownOptions
        : null,
      placeholder_text: placeholderText || null,
      field_category: fieldCategory,
      display_order: displayOrder,
    });

    resetForm();
    setIsCreateModalOpen(false);
  };

  const handleEditField = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFieldId) return;

    await updateField(selectedFieldId, {
      name: fieldName,
      field_type: fieldType,
      required: isRequired,
      options: (fieldType === 'select' || fieldType === 'multi-select') && dropdownOptions.length > 0
        ? dropdownOptions
        : null,
      placeholder_text: placeholderText || null,
      field_category: fieldCategory,
      display_order: displayOrder,
    });

    resetForm();
    setIsEditModalOpen(false);
  };

  const resetForm = () => {
    setFieldId('');
    setFieldName('');
    setFieldDescription('');
    setFieldType('text');
    setIsRequired(false);
    setDisplayLocation('before');
    setDisplayOrder(1);
    setDropdownOptions([]);
    setPlaceholderText('');
    setFieldCategory('custom');
    setSelectedFieldId(null);
  };

  const handleDeleteClick = (id: string) => {
    setSelectedFieldId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedFieldId) {
      await deleteField(selectedFieldId);
      setIsDeleteModalOpen(false);
    }
  };

  const getFieldTypeLabel = (type: string) => {
    switch (type) {
      case 'phone': return 'Phone Number';
      case 'text': return 'Text Information';
      case 'date': return 'Birth Date';
      case 'select': return 'Dropdown Selection';
      case 'multi-select': return 'Multiple Choice Dropdown';
      case 'textarea': return 'Multi-line Text';
      case 'number': return 'Number';
      case 'checkbox': return 'Checkbox';
      case 'rich-text': return 'Rich Text';
      case 'radio': return 'Radio Buttons';
      case 'rating': return 'Star Rating';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const fieldTypes = [
    {
      value: 'phone',
      icon: Phone,
      title: 'Phone Number',
      description: 'Collect phone numbers with country-specific formats',
      example: 'Auto-detects country from tournament settings',
      category: 'contact',
    },
    {
      value: 'text',
      icon: FileText,
      title: 'Text Information',
      description: 'Single-line text input for short answers',
      example: 'Player nickname, team name',
      category: 'custom',
    },
    {
      value: 'date',
      icon: Calendar,
      title: 'Birth Date',
      description: 'Date picker for date of birth',
      example: '01/15/1995',
      category: 'personal',
    },
    {
      value: 'select',
      icon: ChevronDown,
      title: 'Dropdown Selection',
      description: 'Single choice from a list of options',
      example: 'Skill level: Beginner, Intermediate, Advanced',
      category: 'custom',
    },
    {
      value: 'multi-select',
      icon: CheckSquare,
      title: 'Multiple Choice Dropdown',
      description: 'Allow selecting multiple options from a list',
      example: 'Preferred games, available days',
      category: 'custom',
    },
  ];

  const incrementDisplayOrder = () => {
    setDisplayOrder(prev => prev + 1);
  };

  const decrementDisplayOrder = () => {
    setDisplayOrder(prev => (prev > 1 ? prev - 1 : 1));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-5 w-5 text-gray-400" />}
          />
        </div>
        
        <Button 
          leftIcon={<Plus size={16} />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Ajouter une info
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Tournament Info</CardTitle>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
            </div>
          ) : fields.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No custom fields found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">{field.name}</TableCell>
                    <TableCell>{getFieldTypeLabel(field.field_type)}</TableCell>
                    <TableCell>{field.required ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          title="Edit"
                          onClick={() => {
                            setSelectedFieldId(field.id);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          title="Delete"
                          onClick={() => handleDeleteClick(field.id)}
                        >
                          <Trash2 size={16} className="text-error-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Create Field Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          resetForm();
          setIsCreateModalOpen(false);
        }}
        title="Add Tournament Info"
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => {
              resetForm();
              setIsCreateModalOpen(false);
            }}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-field-form"
              isLoading={isLoading}
              disabled={!fieldName || !fieldType || ((fieldType === 'select' || fieldType === 'multi-select') && dropdownOptions.length === 0)}
            >
              Create Tournament Info
            </Button>
          </div>
        }
      >
        <form id="create-field-form" onSubmit={handleCreateField} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Choose the type of information you want to collect
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select the field type that best matches your needs
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fieldTypes.map((type) => (
                <FieldTypeCard
                  key={type.value}
                  icon={type.icon}
                  title={type.title}
                  description={type.description}
                  example={type.example}
                  value={type.value}
                  selected={fieldType === type.value}
                  onClick={() => {
                    setFieldType(type.value);
                    setFieldCategory(type.category);
                    if (type.value !== 'select' && type.value !== 'multi-select') {
                      setDropdownOptions([]);
                    }
                  }}
                />
              ))}
            </div>
          </div>

          <Input
            label="Field Name"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            placeholder="Enter a descriptive name for this field"
            required
          />

          <Input
            label="Placeholder Text (Optional)"
            value={placeholderText}
            onChange={(e) => setPlaceholderText(e.target.value)}
            placeholder="Hint text to show in the field"
          />

          {(fieldType === 'select' || fieldType === 'multi-select') && (
            <DropdownOptionsBuilder
              options={dropdownOptions}
              onChange={setDropdownOptions}
              label={fieldType === 'multi-select' ? 'Multiple Choice Options' : 'Dropdown Options'}
            />
          )}

          <Checkbox
            label="Required Field"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
          />
        </form>
      </Modal>

      {/* Edit Field Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          resetForm();
          setIsEditModalOpen(false);
        }}
        title="Edit Tournament Info"
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => {
              resetForm();
              setIsEditModalOpen(false);
            }}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-field-form"
              isLoading={isLoading}
              disabled={!fieldName || !fieldType || ((fieldType === 'select' || fieldType === 'multi-select') && dropdownOptions.length === 0)}
            >
              Update Tournament Info
            </Button>
          </div>
        }
      >
        <form id="edit-field-form" onSubmit={handleEditField} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Choose the type of information you want to collect
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select the field type that best matches your needs
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fieldTypes.map((type) => (
                <FieldTypeCard
                  key={type.value}
                  icon={type.icon}
                  title={type.title}
                  description={type.description}
                  example={type.example}
                  value={type.value}
                  selected={fieldType === type.value}
                  onClick={() => {
                    setFieldType(type.value);
                    setFieldCategory(type.category);
                    if (type.value !== 'select' && type.value !== 'multi-select') {
                      setDropdownOptions([]);
                    }
                  }}
                />
              ))}
            </div>
          </div>

          <Input
            label="Field Name"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            placeholder="Enter a descriptive name for this field"
            required
          />

          <Input
            label="Placeholder Text (Optional)"
            value={placeholderText}
            onChange={(e) => setPlaceholderText(e.target.value)}
            placeholder="Hint text to show in the field"
          />

          {(fieldType === 'select' || fieldType === 'multi-select') && (
            <DropdownOptionsBuilder
              options={dropdownOptions}
              onChange={setDropdownOptions}
              label={fieldType === 'multi-select' ? 'Multiple Choice Options' : 'Dropdown Options'}
            />
          )}

          <Checkbox
            label="Required Field"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
          />
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
        footer={
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} isLoading={isLoading}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-white">Are you sure you want to delete this field? This action cannot be undone and may affect existing tournaments.</p>
      </Modal>
    </div>
  );
};

export default FieldsPage;