import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, X, Trophy, Award, Medal, Crown, Edit2, DollarSign, Gift } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Prize {
  id?: string;
  position: number;
  title: string;
  description: string;
  image_url?: string | null;
  imageFile?: File | null;
  imagePreview?: string | null;
  prize_type: 'monetary' | 'physical_digital';
  monetary_amount?: number | null;
  currency?: string | null;
  redemption_code?: string | null;
}

interface PrizeManagerProps {
  tournamentId: string;
  onPrizesChange?: (prizes: Prize[]) => void;
  initialPrizes?: Prize[];
  isEditing?: boolean;
}

const PrizeManager: React.FC<PrizeManagerProps> = ({
  tournamentId,
  onPrizesChange,
  initialPrizes = [],
  isEditing = false
}) => {
  const [prizes, setPrizes] = useState<Prize[]>(initialPrizes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [prizeToDelete, setPrizeToDelete] = useState<number | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prizeType, setPrizeType] = useState<'monetary' | 'physical_digital'>('physical_digital');
  const [monetaryAmount, setMonetaryAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('EUR');
  const [redemptionCode, setRedemptionCode] = useState<string>('');

  useEffect(() => {
    if (isEditing && tournamentId) {
      fetchExistingPrizes();
    }
  }, [isEditing, tournamentId]);

  useEffect(() => {
    if (onPrizesChange) {
      onPrizesChange(prizes);
    }
  }, [prizes, onPrizesChange]);

  const fetchExistingPrizes = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_prizes')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('position', { ascending: true });

      if (error) throw error;

      const formattedPrizes = data.map(prize => ({
        id: prize.id,
        position: prize.position,
        title: prize.title,
        description: prize.prize_name, // Map prize_name to description
        image_url: prize.image_url,
        imagePreview: prize.image_url,
        prize_type: prize.prize_type || 'physical_digital',
        monetary_amount: prize.monetary_amount,
        currency: prize.currency,
        redemption_code: prize.redemption_code
      }));

      setPrizes(formattedPrizes);
    } catch (error) {
      console.error('Error fetching prizes:', error);
      toast.error('Failed to load existing prizes');
    }
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-orange-600" />;
      default:
        return <Trophy className="h-5 w-5 text-blue-500" />;
    }
  };

  const getPositionTitle = (position: number) => {
    const suffixes = ['st', 'nd', 'rd'];
    const suffix = position <= 3 ? suffixes[position - 1] : 'th';
    return `${position}${suffix} Place`;
  };

  const addPrize = () => {
    const newPosition = prizes.length + 1;
    setTitle(getPositionTitle(newPosition));
    setDescription('');
    setImageFile(null);
    setImagePreview(null);
    setPrizeType('physical_digital');
    setMonetaryAmount('');
    setCurrency('EUR');
    setRedemptionCode('');
    setEditingPrize(null);
    setIsModalOpen(true);
  };

  const editPrize = (prize: Prize) => {
    setTitle(prize.title);
    setDescription(prize.description);
    setImageFile(null);
    setImagePreview(prize.imagePreview || null);
    setPrizeType(prize.prize_type);
    setMonetaryAmount(prize.monetary_amount?.toString() || '');
    setCurrency(prize.currency || 'EUR');
    setRedemptionCode(prize.redemption_code || '');
    setEditingPrize(prize);
    setIsModalOpen(true);
    toast(`Editing ${prize.title}`, { icon: '✏️' });
  };

  const confirmRemovePrize = (position: number) => {
    setPrizeToDelete(position);
    setShowDeleteConfirm(true);
  };

  const removePrize = async () => {
    if (prizeToDelete === null) return;

    try {
      // If editing an existing tournament, delete from database
      if (isEditing && tournamentId) {
        const prize = prizes.find(p => p.position === prizeToDelete);
        if (prize && prize.id) {
          const { error } = await supabase
            .from('tournament_prizes')
            .delete()
            .eq('id', prize.id);

          if (error) throw error;
        }
      }

      // Update local state
      const updatedPrizes = prizes
        .filter(p => p.position !== prizeToDelete)
        .map((prize, index) => ({
          ...prize,
          position: index + 1,
          title: prize.title.includes('Place') ? getPositionTitle(index + 1) : prize.title
        }));

      setPrizes(updatedPrizes);
      toast.success('Prize removed successfully');
    } catch (error) {
      console.error('Error removing prize:', error);
      toast.error('Failed to remove prize');
    } finally {
      setShowDeleteConfirm(false);
      setPrizeToDelete(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const changeImage = () => {
    // Trigger file input click
    const fileInput = document.getElementById('prize-image-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `tournament-prizes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tournament-image-bucket')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('tournament-image-bucket')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const savePrize = async () => {
    // Validation based on prize type
    if (!title.trim()) {
      toast.error('Please enter a prize title');
      return;
    }

    if (prizeType === 'monetary') {
      if (!monetaryAmount || parseFloat(monetaryAmount) <= 0) {
        toast.error('Please enter a valid monetary amount');
        return;
      }
      if (!currency.trim()) {
        toast.error('Please select a currency');
        return;
      }
    } else {
      if (!description.trim()) {
        toast.error('Please enter a prize description');
        return;
      }
    }

    setIsLoading(true);

    try {
      let imageUrl = editingPrize?.image_url || null;

      // Upload new image if provided
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      } else if (!imagePreview && editingPrize?.image_url) {
        // Image was removed
        imageUrl = null;
      }

      if (editingPrize) {
        // Update existing prize
        if (isEditing && tournamentId && editingPrize.id) {
          // Update in database - map fields correctly
          const { error } = await supabase
            .from('tournament_prizes')
            .update({
              title: title,
              prize_name: description, // Store description in prize_name field
              image_url: imageUrl,
              prize_type: prizeType,
              monetary_amount: prizeType === 'monetary' ? parseFloat(monetaryAmount) : null,
              currency: prizeType === 'monetary' ? currency : null,
              redemption_code: prizeType === 'physical_digital' ? redemptionCode || null : null
            })
            .eq('id', editingPrize.id);

          if (error) throw error;
        }

        // Update local state
        const updatedPrizes = prizes.map(p =>
          p.position === editingPrize.position
            ? {
                ...p,
                title,
                description,
                image_url: imageUrl,
                imagePreview: imageUrl,
                prize_type: prizeType,
                monetary_amount: prizeType === 'monetary' ? parseFloat(monetaryAmount) : null,
                currency: prizeType === 'monetary' ? currency : null,
                redemption_code: prizeType === 'physical_digital' ? redemptionCode || null : null
              }
            : p
        );
        setPrizes(updatedPrizes);
      } else {
        // Add new prize
        const newPosition = prizes.length + 1;
        const newPrize: Prize = {
          position: newPosition,
          title,
          description,
          image_url: imageUrl,
          imagePreview: imageUrl,
          prize_type: prizeType,
          monetary_amount: prizeType === 'monetary' ? parseFloat(monetaryAmount) : null,
          currency: prizeType === 'monetary' ? currency : null,
          redemption_code: prizeType === 'physical_digital' ? redemptionCode || null : null
        };

        if (isEditing && tournamentId) {
          // Save to database - map fields correctly
          const { data, error } = await supabase
            .from('tournament_prizes')
            .insert({
              tournament_id: tournamentId,
              position: newPosition,
              title: title,
              prize_name: description, // Store description in prize_name field
              image_url: imageUrl,
              prize_type: prizeType,
              monetary_amount: prizeType === 'monetary' ? parseFloat(monetaryAmount) : null,
              currency: prizeType === 'monetary' ? currency : null,
              redemption_code: prizeType === 'physical_digital' ? redemptionCode || null : null
            })
            .select()
            .single();

          if (error) throw error;

          newPrize.id = data.id;
        }

        setPrizes([...prizes, newPrize]);
      }

      resetForm();
      setIsModalOpen(false);
      toast.success(editingPrize ? 'Prize updated successfully' : 'Prize added successfully');
    } catch (error) {
      console.error('Error saving prize:', error);
      toast.error('Failed to save prize');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setImageFile(null);
    setImagePreview(null);
    setPrizeType('physical_digital');
    setMonetaryAmount('');
    setCurrency('EUR');
    setRedemptionCode('');
    setEditingPrize(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
          Tournament Prizes
        </h3>
        <Button
          size="sm"
          onClick={addPrize}
          leftIcon={<Plus className="w-4 h-4" />}
          className="border border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-500"
        >
          Add Prize
        </Button>
      </div>

      {prizes.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">No prizes added yet</p>
          <Button onClick={addPrize} leftIcon={<Plus className="w-4 h-4" />}>
            Add First Prize
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prizes.map((prize) => (
            <div
              key={prize.position}
              className="bg-gray-50 dark:bg-dark-200 p-4 rounded-lg border border-gray-200 dark:border-dark-300 relative group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getPositionIcon(prize.position)}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {prize.title}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    prize.prize_type === 'monetary'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  }`}>
                    {prize.prize_type === 'monetary' ? (
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-3 h-3" />
                        <span>Cash</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <Gift className="w-3 h-3" />
                        <span>Goods</span>
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => editPrize(prize)}
                    className="p-2 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                    title="Edit prize"
                  >
                    <Edit2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => confirmRemovePrize(prize.position)}
                    className="p-2 hover:bg-error-50 dark:hover:bg-error-900/20"
                    title="Delete prize"
                  >
                    <Trash2 className="w-4 h-4 text-error-500 dark:text-error-400" />
                  </Button>
                </div>
              </div>

              {prize.prize_type === 'monetary' ? (
                <div className="mb-3">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {parseFloat(prize.monetary_amount?.toString() || '0').toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} {prize.currency}
                  </div>
                </div>
              ) : (
                <>
                  {prize.imagePreview && (
                    <div className="mb-3">
                      <img
                        src={prize.imagePreview}
                        alt={prize.title}
                        className="w-full h-24 object-cover rounded-md"
                      />
                    </div>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {prize.description}
                  </p>
                  {prize.redemption_code && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <span className="bg-gray-200 dark:bg-dark-300 px-2 py-1 rounded">Code available</span>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPrizeToDelete(null);
        }}
        title="Confirm Delete Prize"
        size="md"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={() => {
                setShowDeleteConfirm(false);
                setPrizeToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={removePrize}
              className="bg-error-500 hover:bg-error-600"
            >
              Delete Prize
            </Button>
          </div>
        }
      >
        <div className="py-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete this prize? This action cannot be undone.
          </p>
          {prizeToDelete !== null && prizes.find(p => p.position === prizeToDelete) && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-dark-200 rounded-md border border-gray-200 dark:border-dark-300">
              <div className="flex items-center space-x-2 mb-2">
                {getPositionIcon(prizeToDelete)}
                <span className="font-medium text-gray-900 dark:text-white">
                  {prizes.find(p => p.position === prizeToDelete)?.title}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {prizes.find(p => p.position === prizeToDelete)?.description}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Prize Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          resetForm();
          setIsModalOpen(false);
        }}
        title={editingPrize ? `Edit Prize: ${editingPrize.title}` : 'Add Prize'}
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={() => {
                resetForm();
                setIsModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={savePrize}
              isLoading={isLoading}
              leftIcon={<Trophy className="w-4 h-4" />}
            >
              {editingPrize ? 'Update Prize' : 'Add Prize'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Prize Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. First Place, Champion, Runner Up"
            required
          />

          {/* Prize Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prize Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPrizeType('monetary')}
                className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  prizeType === 'monetary'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-200 text-gray-700 dark:text-gray-300 hover:border-green-300'
                }`}
              >
                <DollarSign className="w-5 h-5" />
                <span className="font-medium">Cash Prize</span>
              </button>
              <button
                type="button"
                onClick={() => setPrizeType('physical_digital')}
                className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  prizeType === 'physical_digital'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-200 text-gray-700 dark:text-gray-300 hover:border-blue-300'
                }`}
              >
                <Gift className="w-5 h-5" />
                <span className="font-medium">Physical/Digital Goods</span>
              </button>
            </div>
          </div>

          {/* Conditional Fields based on Prize Type */}
          {prizeType === 'monetary' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount <span className="text-error-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-200 px-3 py-2 text-gray-900 dark:text-white focus:border-primary-500 dark:focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={monetaryAmount}
                  onChange={(e) => setMonetaryAmount(e.target.value)}
                  placeholder="1000.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Currency <span className="text-error-500">*</span>
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-200 px-3 py-2 text-gray-900 dark:text-white focus:border-primary-500 dark:focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  required
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CHF">CHF</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                  <option value="TND">TND (Tunisian Dinar)</option>
                  <option value="MAD">MAD (Moroccan Dirham)</option>
                  <option value="XOF">XOF (West African CFA Franc)</option>
                  <option value="ETB">ETB (Ethiopian Birr)</option>
                </select>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prize Description <span className="text-error-500">*</span>
                </label>
                <textarea
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-200 px-3 py-2 text-gray-900 dark:text-white focus:border-primary-500 dark:focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Gaming PC, PlayStation 5, Trophy and Certificate"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Redemption Code / Link (Optional)
                </label>
                <Input
                  value={redemptionCode}
                  onChange={(e) => setRedemptionCode(e.target.value)}
                  placeholder="e.g. Game code, download link, or redemption instructions"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  For digital prizes like game codes, skins, or subscriptions
                </p>
              </div>
            </>
          )}

          {prizeType === 'physical_digital' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prize Image (Optional)
              </label>
              <div className="mt-1 flex items-center space-x-4">
                {imagePreview ? (
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Prize preview"
                        className="h-24 w-32 object-cover rounded-md border-2 border-gray-200 dark:border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-error-500 text-white rounded-full p-1 shadow-sm hover:bg-error-600 transition-colors"
                        title="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={changeImage}
                        leftIcon={<Upload className="h-4 w-4" />}
                      >
                        Change Image
                      </Button>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Recommended: 400x240px
                      </span>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-200 hover:bg-gray-50 dark:hover:bg-dark-100 cursor-pointer transition-colors">
                    <Upload className="h-5 w-5 mr-2" />
                    <span>Upload Image</span>
                    <input
                      id="prize-image-input"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
                {!imagePreview && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Recommended size: 400x240px
                  </span>
                )}
              </div>
              <input
                id="prize-image-input"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default PrizeManager;
