import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Upload, X, Video, Image as ImageIcon, List, FileText, Filter } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateUtils';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface GameContent {
  id: string;
  game_id: string;
  title: string;
  description: string;
  content_type: 'image' | 'video' | 'playlist' | 'news';
  content_url: string;
  created_at: string;
  game: {
    name: string;
  };
  playlist_image_url?: string | null;
  article_text?: string | null;
  article_image_url?: string | null;
}

const ContentsPage: React.FC = () => {
  const { games, fetchGames } = useGameStore();
  const [contents, setContents] = useState<GameContent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<GameContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [contentType, setContentType] = useState<'image' | 'video' | 'playlist' | 'news'>('image');
  const [selectedGameId, setSelectedGameId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [contentPreview, setContentPreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistImageFile, setPlaylistImageFile] = useState<File | null>(null);
  const [playlistImagePreview, setPlaylistImagePreview] = useState<string | null>(null);
  const [articleText, setArticleText] = useState('');
  const [articleImageFile, setArticleImageFile] = useState<File | null>(null);
  const [articleImagePreview, setArticleImagePreview] = useState<string | null>(null);

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
      ['link', 'image'],
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
    'link', 'image'
  ];

  useEffect(() => {
    fetchGames();
    fetchContents();
  }, [fetchGames]);

  useEffect(() => {
    if (selectedContent && isEditModalOpen) {
      setContentType(selectedContent.content_type);
      setSelectedGameId(selectedContent.game_id);
      setTitle(selectedContent.title);
      
      if (selectedContent.content_type === 'news') {
        // For news articles, the content is stored in the description field
        setArticleText(selectedContent.description);
        setDescription(''); // Clear description for news
        if (selectedContent.article_image_url) {
          setArticleImagePreview(selectedContent.article_image_url);
        }
      } else {
        setDescription(selectedContent.description);
        setArticleText(''); // Clear article text for non-news
      }
      
      if (selectedContent.content_type === 'video') {
        setVideoUrl(selectedContent.content_url);
      } else if (selectedContent.content_type === 'playlist') {
        setPlaylistUrl(selectedContent.content_url);
        if (selectedContent.playlist_image_url) {
          setPlaylistImagePreview(selectedContent.playlist_image_url);
        }
      } else if (selectedContent.content_type === 'image') {
        setContentPreview(selectedContent.content_url);
      }
    }
  }, [selectedContent, isEditModalOpen]);

  const fetchContents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('game_contents')
        .select(`
          *,
          game:game_id (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContents(data as GameContent[]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching contents:', error);
      toast.error('Failed to load contents');
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>, setPreview: React.Dispatch<React.SetStateAction<string | null>>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const uploadContent = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `game-contents/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('gaming-image-bucket')
      .upload(filePath, file);
      
    if (uploadError) {
      throw uploadError;
    }
    
    const { data } = supabase.storage
      .from('gaming-image-bucket')
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  };

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      let contentUrl = '';
      let playlistImageUrl = null;
      let articleImageUrl = null;
      let finalDescription = description;
      
      if (contentType === 'image' && contentFile) {
        contentUrl = await uploadContent(contentFile);
      } else if (contentType === 'video') {
        contentUrl = videoUrl;
      } else if (contentType === 'playlist') {
        contentUrl = playlistUrl;
        if (playlistImageFile) {
          playlistImageUrl = await uploadContent(playlistImageFile);
        }
      } else if (contentType === 'news') {
        contentUrl = ''; // No URL needed for news
        finalDescription = articleText; // Store article content in description field
        
        // Upload article image if provided
        if (articleImageFile) {
          articleImageUrl = await uploadContent(articleImageFile);
        }
      }
      
      const { error } = await supabase
        .from('game_contents')
        .insert([{
          game_id: selectedGameId,
          title,
          description: finalDescription,
          content_type: contentType,
          content_url: contentUrl,
          playlist_image_url: playlistImageUrl,
          article_image_url: articleImageUrl
        }]);

      if (error) throw error;
      
      toast.success('Content created successfully');
      resetForm();
      setIsCreateModalOpen(false);
      fetchContents();
    } catch (error) {
      console.error('Error creating content:', error);
      toast.error('Failed to create content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditContent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedContent) return;
    
    try {
      setIsLoading(true);
      
      let contentUrl = selectedContent.content_url;
      let playlistImageUrl = selectedContent.playlist_image_url;
      let articleImageUrl = selectedContent.article_image_url;
      let finalDescription = description;
      
      // If a new image file is uploaded
      if (contentType === 'image' && contentFile) {
        contentUrl = await uploadContent(contentFile);
        
        // Delete old image if it exists
        if (selectedContent.content_type === 'image') {
          const oldFileName = selectedContent.content_url.split('/').pop();
          if (oldFileName) {
            await supabase.storage
              .from('gaming-image-bucket')
              .remove([`game-contents/${oldFileName}`]);
          }
        }
      } else if (contentType === 'video') {
        contentUrl = videoUrl;
      } else if (contentType === 'playlist') {
        contentUrl = playlistUrl;
        
        // If a new playlist image is uploaded
        if (playlistImageFile) {
          playlistImageUrl = await uploadContent(playlistImageFile);
          
          // Delete old playlist image if it exists
          if (selectedContent.playlist_image_url) {
            const oldFileName = selectedContent.playlist_image_url.split('/').pop();
            if (oldFileName) {
              await supabase.storage
                .from('gaming-image-bucket')
                .remove([`game-contents/${oldFileName}`]);
            }
          }
        }
      } else if (contentType === 'news') {
        // For news, we keep the content_url empty and store content in description
        contentUrl = '';
        finalDescription = articleText;
        
        // If a new article image is uploaded
        if (articleImageFile) {
          articleImageUrl = await uploadContent(articleImageFile);
          
          // Delete old article image if it exists
          if (selectedContent.article_image_url) {
            const oldFileName = selectedContent.article_image_url.split('/').pop();
            if (oldFileName) {
              await supabase.storage
                .from('gaming-image-bucket')
                .remove([`game-contents/${oldFileName}`]);
            }
          }
        }
      }
      
      const { error } = await supabase
        .from('game_contents')
        .update({
          game_id: selectedGameId,
          title,
          description: finalDescription,
          content_type: contentType,
          content_url: contentUrl,
          playlist_image_url: playlistImageUrl,
          article_image_url: articleImageUrl
        })
        .eq('id', selectedContent.id);

      if (error) throw error;
      
      toast.success('Content updated successfully');
      resetForm();
      setIsEditModalOpen(false);
      fetchContents();
    } catch (error) {
      console.error('Error updating content:', error);
      toast.error('Failed to update content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteContent = async () => {
    if (!selectedContent) return;
    
    try {
      setIsLoading(true);
      
      // If it's an image, delete from storage
      if (selectedContent.content_type === 'image') {
        const fileName = selectedContent.content_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('gaming-image-bucket')
            .remove([`game-contents/${fileName}`]);
        }
      }
      
      // If it has a playlist image, delete that too
      if (selectedContent.playlist_image_url) {
        const fileName = selectedContent.playlist_image_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('gaming-image-bucket')
            .remove([`game-contents/${fileName}`]);
        }
      }
      
      // If it has an article image, delete that too
      if (selectedContent.article_image_url) {
        const fileName = selectedContent.article_image_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('gaming-image-bucket')
            .remove([`game-contents/${fileName}`]);
        }
      }
      
      const { error } = await supabase
        .from('game_contents')
        .delete()
        .eq('id', selectedContent.id);

      if (error) throw error;
      
      toast.success('Content deleted successfully');
      setIsDeleteModalOpen(false);
      fetchContents();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setContentType('image');
    setSelectedGameId('');
    setContentFile(null);
    setContentPreview(null);
    setVideoUrl('');
    setPlaylistUrl('');
    setPlaylistImageFile(null);
    setPlaylistImagePreview(null);
    setArticleText('');
    setArticleImageFile(null);
    setArticleImagePreview(null);
    setSelectedContent(null);
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-5 w-5 text-blue-500" />;
      case 'video':
        return <Video className="h-5 w-5 text-red-500" />;
      case 'playlist':
        return <List className="h-5 w-5 text-green-500" />;
      case 'news':
        return <FileText className="h-5 w-5 text-purple-500" />;
      default:
        return <ImageIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'image':
        return 'Image';
      case 'video':
        return 'Video';
      case 'playlist':
        return 'Playlist';
      case 'news':
        return 'News Article';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const filteredContents = contents.filter(content => {
    const matchesSearch = content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         content.game.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = contentTypeFilter ? content.content_type === contentTypeFilter : true;
    return matchesSearch && matchesType;
  });

  const renderContentPreview = (content: GameContent) => {
    switch (content.content_type) {
      case 'image':
        return (
          <img 
            src={content.content_url} 
            alt={content.title} 
            className="h-16 w-24 object-cover rounded-md"
          />
        );
      case 'video':
        return (
          <div className="h-16 w-24 bg-gray-200 dark:bg-dark-200 rounded-md flex items-center justify-center">
            <Video className="h-8 w-8 text-red-400" />
          </div>
        );
      case 'playlist':
        return content.playlist_image_url ? (
          <div className="relative h-16 w-24">
            <img 
              src={content.playlist_image_url} 
              alt={content.title} 
              className="h-16 w-24 object-cover rounded-md"
            />
            <div className="absolute bottom-1 right-1 bg-green-500 rounded-full p-1">
              <List className="h-3 w-3 text-white" />
            </div>
          </div>
        ) : (
          <div className="h-16 w-24 bg-gray-200 dark:bg-dark-200 rounded-md flex items-center justify-center">
            <List className="h-8 w-8 text-green-400" />
          </div>
        );
      case 'news':
        return content.article_image_url ? (
          <div className="relative h-16 w-24">
            <img 
              src={content.article_image_url} 
              alt={content.title} 
              className="h-16 w-24 object-cover rounded-md"
            />
            <div className="absolute bottom-1 right-1 bg-purple-500 rounded-full p-1">
              <FileText className="h-3 w-3 text-white" />
            </div>
          </div>
        ) : (
          <div className="h-16 w-24 bg-gray-200 dark:bg-dark-200 rounded-md flex items-center justify-center">
            <FileText className="h-8 w-8 text-purple-400" />
          </div>
        );
      default:
        return (
          <div className="h-16 w-24 bg-gray-200 dark:bg-dark-200 rounded-md flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 gap-3 max-w-md">
          <div className="w-40">
            <Select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value)}
              options={[
                { value: '', label: 'All Types' },
                { value: 'image', label: 'Images' },
                { value: 'video', label: 'Videos' },
                { value: 'playlist', label: 'Playlists' },
                { value: 'news', label: 'News Articles' }
              ]}
              leftIcon={<Filter className="h-5 w-5 text-gray-400" />}
            />
          </div>
          
          <div className="flex-1">
            <Input
              placeholder="Search contents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="h-5 w-5 text-gray-400" />}
            />
          </div>
        </div>
        
        <div>
          <Button 
            leftIcon={<Plus size={16} />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Add Content
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Game Contents</CardTitle>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
            </div>
          ) : filteredContents.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No contents found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Game</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContents.map((content) => (
                  <TableRow key={content.id}>
                    <TableCell>
                      {renderContentPreview(content)}
                    </TableCell>
                    <TableCell className="font-medium">{content.title}</TableCell>
                    <TableCell>{content.game.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {getContentTypeIcon(content.content_type)}
                        <span className="capitalize">{getContentTypeLabel(content.content_type)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(content.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          title="Edit"
                          onClick={() => {
                            setSelectedContent(content);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          title="Delete"
                          onClick={() => {
                            setSelectedContent(content);
                            setIsDeleteModalOpen(true);
                          }}
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

      {/* Create Content Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          resetForm();
          setIsCreateModalOpen(false);
        }}
        title="Add New Content"
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button 
              variant="ghost" 
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              form="create-content-form" 
              isLoading={isLoading}
            >
              Create Content
            </Button>
          </div>
        }
      >
        <form id="create-content-form" onSubmit={handleCreateContent} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content Type
            </label>
            <Select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as 'image' | 'video' | 'playlist' | 'news')}
              options={[
                { value: 'image', label: 'Image' },
                { value: 'video', label: 'Video' },
                { value: 'playlist', label: 'Playlist' },
                { value: 'news', label: 'News Article' }
              ]}
            />
          </div>

          <Select
            label="Game"
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
            options={[
              { value: '', label: 'Select a game' },
              ...games.map(game => ({
                value: game.id,
                label: game.name
              }))
            ]}
            required
          />

          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {contentType !== 'news' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-200 px-3 py-2 text-gray-900 dark:text-white focus:border-primary-500 dark:focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          )}

          {/* Dynamic content fields based on content type */}
          {contentType === 'image' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Upload Image
              </label>
              <div className="mt-1 flex items-center space-x-4">
                {contentPreview ? (
                  <div className="relative">
                    <img 
                      src={contentPreview} 
                      alt="Content preview" 
                      className="h-32 w-48 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setContentFile(null);
                        setContentPreview(null);
                      }}
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
                      onChange={(e) => handleFileChange(e, setContentFile, setContentPreview)}
                      required={contentType === 'image'}
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {contentType === 'video' && (
            <Input
              label="Video URL"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Enter YouTube or Vimeo URL"
              required={contentType === 'video'}
            />
          )}

          {contentType === 'playlist' && (
            <div className="space-y-4">
              <Input
                label="YouTube Playlist URL"
                type="url"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                placeholder="Enter YouTube Playlist URL"
                required={contentType === 'playlist'}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Playlist Cover Image
                </label>
                <div className="mt-1 flex items-center space-x-4">
                  {playlistImagePreview ? (
                    <div className="relative">
                      <img 
                        src={playlistImagePreview} 
                        alt="Playlist cover" 
                        className="h-32 w-48 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPlaylistImageFile(null);
                          setPlaylistImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-error-500 text-white rounded-full p-1 shadow-sm hover:bg-error-600 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-200 hover:bg-gray-50 dark:hover:bg-dark-100 cursor-pointer transition-colors">
                      <Upload className="h-5 w-5 mr-2" />
                      <span>Upload Cover Image</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setPlaylistImageFile, setPlaylistImagePreview)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {contentType === 'news' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Article Cover Image
                </label>
                <div className="mt-1 flex items-center space-x-4">
                  {articleImagePreview ? (
                    <div className="relative">
                      <img 
                        src={articleImagePreview} 
                        alt="Article cover" 
                        className="h-32 w-48 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setArticleImageFile(null);
                          setArticleImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-error-500 text-white rounded-full p-1 shadow-sm hover:bg-error-600 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-200 hover:bg-gray-50 dark:hover:bg-dark-100 cursor-pointer transition-colors">
                      <Upload className="h-5 w-5 mr-2" />
                      <span>Upload Cover Image</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setArticleImageFile, setArticleImagePreview)}
                      />
                    </label>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Article Content
                </label>
                <div className="mt-1 bg-white rounded-md">
                  <ReactQuill 
                    theme="snow"
                    value={articleText}
                    onChange={setArticleText}
                    modules={quillModules}
                    formats={quillFormats}
                    style={{ height: '200px', marginBottom: '50px' }}
                  />
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Edit Content Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          resetForm();
          setIsEditModalOpen(false);
        }}
        title="Edit Content"
        size="lg"
        footer={
          <div className="flex justify-end space-x-3">
            <Button 
              variant="ghost" 
              onClick={() => {
                resetForm();
                setIsEditModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              form="edit-content-form" 
              isLoading={isLoading}
            >
              Update Content
            </Button>
          </div>
        }
      >
        <form id="edit-content-form" onSubmit={handleEditContent} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content Type
            </label>
            <Select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as 'image' | 'video' | 'playlist' | 'news')}
              options={[
                { value: 'image', label: 'Image' },
                { value: 'video', label: 'Video' },
                { value: 'playlist', label: 'Playlist' },
                { value: 'news', label: 'News Article' }
              ]}
            />
          </div>

          <Select
            label="Game"
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
            options={[
              { value: '', label: 'Select a game' },
              ...games.map(game => ({
                value: game.id,
                label: game.name
              }))
            ]}
            required
          />

          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {contentType !== 'news' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-200 px-3 py-2 text-gray-900 dark:text-white focus:border-primary-500 dark:focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          )}

          {/* Dynamic content fields based on content type */}
          {contentType === 'image' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Upload Image
              </label>
              <div className="mt-1 flex items-center space-x-4">
                {contentPreview ? (
                  <div className="relative">
                    <img 
                      src={contentPreview} 
                      alt="Content preview" 
                      className="h-32 w-48 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setContentFile(null);
                        setContentPreview(null);
                      }}
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
                      onChange={(e) => handleFileChange(e, setContentFile, setContentPreview)}
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {contentType === 'video' && (
            <Input
              label="Video URL"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Enter YouTube or Vimeo URL"
              required={contentType === 'video'}
            />
          )}

          {contentType === 'playlist' && (
            <div className="space-y-4">
              <Input
                label="YouTube Playlist URL"
                type="url"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                placeholder="Enter YouTube Playlist URL"
                required={contentType === 'playlist'}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Playlist Cover Image
                </label>
                <div className="mt-1 flex items-center space-x-4">
                  {playlistImagePreview ? (
                    <div className="relative">
                      <img 
                        src={playlistImagePreview} 
                        alt="Playlist cover" 
                        className="h-32 w-48 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPlaylistImageFile(null);
                          setPlaylistImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-error-500 text-white rounded-full p-1 shadow-sm hover:bg-error-600 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-200 hover:bg-gray-50 dark:hover:bg-dark-100 cursor-pointer transition-colors">
                      <Upload className="h-5 w-5 mr-2" />
                      <span>Upload Cover Image</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setPlaylistImageFile, setPlaylistImagePreview)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {contentType === 'news' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Article Cover Image
                </label>
                <div className="mt-1 flex items-center space-x-4">
                  {articleImagePreview ? (
                    <div className="relative">
                      <img 
                        src={articleImagePreview} 
                        alt="Article cover" 
                        className="h-32 w-48 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setArticleImageFile(null);
                          setArticleImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-error-500 text-white rounded-full p-1 shadow-sm hover:bg-error-600 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-200 hover:bg-gray-50 dark:hover:bg-dark-100 cursor-pointer transition-colors">
                      <Upload className="h-5 w-5 mr-2" />
                      <span>Upload Cover Image</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setArticleImageFile, setArticleImagePreview)}
                      />
                    </label>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Article Content
                </label>
                <div className="mt-1 bg-white rounded-md">
                  <ReactQuill 
                    theme="snow"
                    value={articleText}
                    onChange={setArticleText}
                    modules={quillModules}
                    formats={quillFormats}
                    style={{ height: '200px', marginBottom: '50px' }}
                  />
                </div>
              </div>
            </div>
          )}
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
            <Button variant="danger" onClick={handleDeleteContent} isLoading={isLoading}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-white">Are you sure you want to delete this content? This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default ContentsPage;