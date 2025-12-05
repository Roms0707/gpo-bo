import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Upload, X, User, Key } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import Badge from '../components/ui/Badge';

interface GamePublisherId {
  id: string;
  game_id: string;
  label: string;
  id_name: string;
  required: boolean;
}

const GamesPage: React.FC = () => {
  const { games, fetchGames, createGame, updateGame, deleteGame, isLoading } = useGameStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  
  // Form state
  const [gameName, setGameName] = useState('');
  const [publisherName, setPublisherName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [hasApi, setHasApi] = useState(false);
  const [apiKey, setApiKey] = useState('');
  
  // Edit form state
  const [editGameName, setEditGameName] = useState('');
  const [editPublisherName, setEditPublisherName] = useState('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editHasApi, setEditHasApi] = useState(false);
  const [editApiKey, setEditApiKey] = useState('');
  
  // Publisher IDs state
  const [publisherIds, setPublisherIds] = useState<GamePublisherId[]>([]);
  const [newPublisherIdLabel, setNewPublisherIdLabel] = useState('');
  const [newPublisherIdName, setNewPublisherIdName] = useState('');
  const [newPublisherIdRequired, setNewPublisherIdRequired] = useState(false);
  const [isAddingPublisherId, setIsAddingPublisherId] = useState(false);
  const [isDeletingPublisherId, setIsDeletingPublisherId] = useState(false);
  const [selectedPublisherId, setSelectedPublisherId] = useState<string | null>(null);
  const [publisherIdFormError, setPublisherIdFormError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    // When edit modal opens, fetch publisher IDs for the selected game
    if (isEditModalOpen && selectedGameId) {
      fetchPublisherIds(selectedGameId);
    }
  }, [isEditModalOpen, selectedGameId]);

  const filteredGames = games.filter(game => 
    game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (game.publisher && game.publisher.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>, setPreview: React.Dispatch<React.SetStateAction<string | null>>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = (setFile: React.Dispatch<React.SetStateAction<File | null>>, setPreview: React.Dispatch<React.SetStateAction<string | null>>) => {
    setFile(null);
    setPreview(null);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      if (!file) return null;
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `games/${fileName}`;
      
      // Upload the file to the bucket
      const { error: uploadError } = await supabase.storage
        .from('tournament-image-bucket')
        .upload(filePath, file);
        
      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        toast.error(`Error uploading file: ${uploadError.message}`);
        return null;
      }
      
      // Get the public URL for the uploaded file
      const { data } = supabase.storage
        .from('tournament-image-bucket')
        .getPublicUrl(filePath);
        
      return data.publicUrl;
    } catch (error) {
      console.error('Error in file upload:', error);
      toast.error('Failed to upload file. Please try again.');
      return null;
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Upload image if provided
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
        if (!imageUrl && imageFile) {
          toast.error('Failed to upload game image');
          return;
        }
      }
      
      const { data: newGame, error } = await createGame({
        name: gameName,
        publisher: publisherName || null,
        image_url: imageUrl,
        has_an_api: hasApi,
        api_key: hasApi ? apiKey : null,
      });
      
      if (error) throw error;
      
      console.log("Game created successfully, newGame:", newGame);
      
      // Reset form and close modal
      setGameName('');
      setPublisherName('');
      setImageFile(null);
      setImagePreview(null);
      setHasApi(false);
      setApiKey('');
      setIsCreateModalOpen(false);
      
      // Open edit modal for the new game to add publisher IDs
      if (newGame) {
        console.log("Setting selectedGameId to:", newGame.id);
        setSelectedGameId(newGame.id);
        setEditGameName(newGame.name);
        setEditPublisherName(newGame.publisher || '');
        setEditImagePreview(newGame.image_url);
        setEditHasApi(newGame.has_an_api || false);
        setEditApiKey(newGame.api_key || '');
        await fetchPublisherIds(newGame.id);
        setIsEditModalOpen(true);
      }
    } catch (error) {
      console.error('Error creating game:', error);
    }
  };

  const handleEditClick = (id: string) => {
    const gameToEdit = games.find(game => game.id === id);
    if (gameToEdit) {
      setSelectedGameId(id);
      setEditGameName(gameToEdit.name);
      setEditPublisherName(gameToEdit.publisher || '');
      setEditImagePreview(gameToEdit.image_url);
      setEditImageFile(null);
      setEditHasApi(gameToEdit.has_an_api || false);
      setEditApiKey(gameToEdit.api_key || '');
      setIsEditModalOpen(true);
    }
  };

  const handleUpdateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGameId) return;
    
    try {
      const gameToUpdate = games.find(game => game.id === selectedGameId);
      if (!gameToUpdate) return;
      
      // Upload image if a new one is provided
      let imageUrl = gameToUpdate.image_url;
      if (editImageFile) {
        const newImageUrl = await uploadImage(editImageFile);
        if (newImageUrl) {
          imageUrl = newImageUrl;
        } else if (editImageFile) {
          toast.error('Failed to upload game image');
          return;
        }
      }
      
      // If the image was removed (preview is null and no new file), set URL to null
      if (!editImagePreview && !editImageFile) {
        imageUrl = null;
      }
      
      await updateGame(selectedGameId, {
        name: editGameName,
        publisher: editPublisherName || null,
        image_url: imageUrl,
        has_an_api: editHasApi,
        api_key: editHasApi ? editApiKey : null,
      });
      
      // Reset form and close modal
      setEditGameName('');
      setEditPublisherName('');
      setEditImageFile(null);
      setEditImagePreview(null);
      setEditHasApi(false);
      setEditApiKey('');
      setSelectedGameId(null);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating game:', error);
    }
  };

  const handleDeleteClick = (id: string) => {
    setSelectedGameId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedGameId) {
      await deleteGame(selectedGameId);
      setIsDeleteModalOpen(false);
      setSelectedGameId(null);
    }
  };
  
  const resetCreateForm = () => {
    setGameName('');
    setPublisherName('');
    setImageFile(null);
    setImagePreview(null);
    setHasApi(false);
    setApiKey('');
  };
  
  const resetEditForm = () => {
    setEditGameName('');
    setEditPublisherName('');
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditHasApi(false);
    setEditApiKey('');
    setSelectedGameId(null);
    setPublisherIds([]);
    setNewPublisherIdLabel('');
    setNewPublisherIdName('');
    setNewPublisherIdRequired(false);
    setPublisherIdFormError(null);
  };

  const fetchPublisherIds = async (gameId: string) => {
    try {
      console.log("fetchPublisherIds called with gameId:", gameId);
      const { data, error } = await supabase
        .from('game_publisher_ids')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      console.log("Publisher IDs fetched:", data);
      setPublisherIds(data || []);
    } catch (error) {
      console.error('Error fetching publisher IDs:', error);
      toast.error('Failed to load publisher IDs');
    }
  };

  const handleAddPublisherId = async () => {
    console.log("handleAddPublisherId called with gameId:", selectedGameId);
    
    // Clear previous error
    setPublisherIdFormError(null);
    
    // Validate form fields
    if (!selectedGameId) {
      console.error("Game ID is missing, selectedGameId:", selectedGameId);
      setPublisherIdFormError('Game ID is missing');
      return;
    }
    
    if (!newPublisherIdLabel.trim()) {
      setPublisherIdFormError('Display label is required');
      return;
    }
    
    if (!newPublisherIdName.trim()) {
      setPublisherIdFormError('ID name is required');
      return;
    }
    
    try {
      setIsAddingPublisherId(true);
      
      console.log("Adding publisher ID with gameId:", selectedGameId);
      const { data, error } = await supabase
        .from('game_publisher_ids')
        .insert({
          game_id: selectedGameId,
          label: newPublisherIdLabel.trim(),
          id_name: newPublisherIdName.trim(),
          required: newPublisherIdRequired
        })
        .select()
        .single();
        
      if (error) throw error;
      
      console.log("Publisher ID added successfully:", data);
      setPublisherIds([...publisherIds, data]);
      setNewPublisherIdLabel('');
      setNewPublisherIdName('');
      setNewPublisherIdRequired(false);
      
      toast.success('Publisher ID type added successfully');
    } catch (error) {
      console.error('Error adding publisher ID:', error);
      toast.error('Failed to add publisher ID type');
    } finally {
      setIsAddingPublisherId(false);
    }
  };

  const handleDeletePublisherId = async (id: string) => {
    try {
      setIsDeletingPublisherId(true);
      setSelectedPublisherId(id);
      
      const { error } = await supabase
        .from('game_publisher_ids')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setPublisherIds(publisherIds.filter(pid => pid.id !== id));
      toast.success('Publisher ID type deleted successfully');
    } catch (error) {
      console.error('Error deleting publisher ID:', error);
      toast.error('Failed to delete publisher ID type');
    } finally {
      setIsDeletingPublisherId(false);
      setSelectedPublisherId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search games..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-5 w-5 text-gray-400" />}
          />
        </div>
        
        <Button 
          leftIcon={<Plus size={16} />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Add Game
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Games</CardTitle>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No games found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Game Name</TableHead>
                  <TableHead>Publisher</TableHead>
                  <TableHead>API</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGames.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell>
                      {game.image_url ? (
                        <img 
                          src={game.image_url} 
                          alt={game.name} 
                          className="h-10 w-16 object-cover rounded-md" 
                        />
                      ) : (
                        <div className="h-10 w-16 bg-gray-200 dark:bg-dark-200 rounded-md flex items-center justify-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400">No Image</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{game.name}</TableCell>
                    <TableCell>{game.publisher || '-'}</TableCell>
                    <TableCell>
                      {game.has_an_api ? (
                        <Badge variant="success">API Enabled</Badge>
                      ) : (
                        <Badge variant="secondary">No API</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          title="Edit"
                          onClick={() => handleEditClick(game.id)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          title="Delete"
                          onClick={() => handleDeleteClick(game.id)}
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
      
      {/* Create Game Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          resetCreateForm();
          setIsCreateModalOpen(false);
        }}
        title="Add New Game"
        footer={
          <div className="flex justify-end space-x-3">
            <Button 
              variant="ghost" 
              onClick={() => {
                resetCreateForm();
                setIsCreateModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="create-game-form" isLoading={isLoading}>
              Create Game
            </Button>
          </div>
        }
      >
        <form id="create-game-form" onSubmit={handleCreateGame} className="space-y-4">
          <Input
            label="Game Name"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            required
          />
          
          <Input
            label="Publisher"
            value={publisherName}
            onChange={(e) => setPublisherName(e.target.value)}
            placeholder="e.g. Riot Games, Valve, etc."
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Game Image
            </label>
            <div className="mt-1 flex items-center space-x-4">
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Game image preview" 
                    className="h-32 w-48 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(setImageFile, setImagePreview)}
                    className="absolute -top-2 -right-2 bg-error-500 text-white rounded-full p-1 shadow-sm hover:bg-error-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-200 hover:bg-gray-50 dark:hover:bg-dark-100 cursor-pointer transition-colors">
                  <Upload className="h-5 w-5 mr-2" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, setImageFile, setImagePreview)}
                  />
                </label>
              )}
              {!imagePreview && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Recommended size: 400x240px
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="has-api"
                checked={hasApi}
                onChange={(e) => setHasApi(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="has-api" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Game has an API
              </label>
            </div>
            
            {hasApi && (
              <Input
                label="API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API key"
                leftIcon={<Key className="h-5 w-5 text-gray-400" />}
              />
            )}
          </div>
          
          <div className="pt-2 border-t border-gray-200 dark:border-dark-200 mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              After creating the game, you'll be able to add publisher ID types that players need to provide.
            </p>
          </div>
        </form>
      </Modal>
      
      {/* Edit Game Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          resetEditForm();
          setIsEditModalOpen(false);
        }}
        title="Edit Game"
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button 
              variant="ghost" 
              onClick={() => {
                resetEditForm();
                setIsEditModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="edit-game-form" isLoading={isLoading}>
              Update Game
            </Button>
          </div>
        }
      >
        <form id="edit-game-form" onSubmit={handleUpdateGame} className="space-y-4">
          <Input
            label="Game Name"
            value={editGameName}
            onChange={(e) => setEditGameName(e.target.value)}
            required
          />
          
          <Input
            label="Publisher"
            value={editPublisherName}
            onChange={(e) => setEditPublisherName(e.target.value)}
            placeholder="e.g. Riot Games, Valve, etc."
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Game Image
            </label>
            <div className="mt-1 flex items-center space-x-4">
              {editImagePreview ? (
                <div className="relative">
                  <img 
                    src={editImagePreview} 
                    alt="Game image preview" 
                    className="h-32 w-48 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(setEditImageFile, setEditImagePreview)}
                    className="absolute -top-2 -right-2 bg-error-500 text-white rounded-full p-1 shadow-sm hover:bg-error-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-200 hover:bg-gray-50 dark:hover:bg-dark-100 cursor-pointer transition-colors">
                  <Upload className="h-5 w-5 mr-2" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, setEditImageFile, setEditImagePreview)}
                  />
                </label>
              )}
              {!editImagePreview && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Recommended size: 400x240px
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="edit-has-api"
                checked={editHasApi}
                onChange={(e) => setEditHasApi(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="edit-has-api" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Game has an API
              </label>
            </div>
            
            {editHasApi && (
              <Input
                label="API Key"
                value={editApiKey}
                onChange={(e) => setEditApiKey(e.target.value)}
                placeholder="Enter API key"
                leftIcon={<Key className="h-5 w-5 text-gray-400" />}
              />
            )}
          </div>
          
          {/* Publisher IDs section */}
          <div className="pt-4 border-t border-gray-200 dark:border-dark-200 mt-4">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
              Publisher IDs
            </h3>
            
            {/* Add Publisher ID form */}
            <div className="bg-gray-50 dark:bg-dark-200 p-4 rounded-lg mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Add a Publisher ID
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Display Label"
                  value={newPublisherIdLabel}
                  onChange={(e) => setNewPublisherIdLabel(e.target.value)}
                  placeholder="e.g. Steam ID"
                  error={publisherIdFormError && !newPublisherIdLabel.trim() ? "Display label is required" : undefined}
                  className={publisherIdFormError && !newPublisherIdLabel.trim() ? "border-error-500" : ""}
                />
                <Input
                  label="ID Name"
                  value={newPublisherIdName}
                  onChange={(e) => setNewPublisherIdName(e.target.value)}
                  placeholder="e.g. steam_id"
                  error={publisherIdFormError && !newPublisherIdName.trim() ? "ID name is required" : undefined}
                  className={publisherIdFormError && !newPublisherIdName.trim() ? "border-error-500" : ""}
                />
                <div className="flex items-end mb-1">
                  <div className="flex items-center h-10">
                    <input
                      type="checkbox"
                      id="publisher-id-required"
                      checked={newPublisherIdRequired}
                      onChange={(e) => setNewPublisherIdRequired(e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="publisher-id-required" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Required
                    </label>
                  </div>
                </div>
              </div>
              {publisherIdFormError && (
                <div className="mt-2 text-sm text-error-500">
                  {publisherIdFormError}
                </div>
              )}
              <div className="mt-4">
                <Button
                  onClick={handleAddPublisherId}
                  isLoading={isAddingPublisherId}
                  leftIcon={<Plus size={16} />}
                  disabled={!newPublisherIdLabel.trim() || !newPublisherIdName.trim()}
                >
                  Add Publisher ID
                </Button>
              </div>
            </div>

            {/* Publisher IDs list */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Publisher ID Types
              </h4>
              {publisherIds.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400">
                    No publisher ID types defined for this game yet
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-dark-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-100">
                    <thead className="bg-gray-100 dark:bg-dark-300">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Label
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          ID Name
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Required
                        </th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-200 divide-y divide-gray-200 dark:divide-dark-100">
                      {publisherIds.map((publisherId) => (
                        <tr key={publisherId.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {publisherId.label}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {publisherId.id_name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {publisherId.required ? (
                              <Badge variant="primary">Required</Badge>
                            ) : (
                              <Badge variant="secondary">Optional</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-error-500 hover:text-error-700"
                              onClick={() => handleDeletePublisherId(publisherId.id)}
                              isLoading={isDeletingPublisherId && selectedPublisherId === publisherId.id}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
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
        <p>Are you sure you want to delete this game? This action cannot be undone.</p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Note: Tournaments associated with this game will have their game reference removed.
        </p>
      </Modal>
    </div>
  );
};

export default GamesPage;