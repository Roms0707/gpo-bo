import React, { useEffect, useState } from 'react';
import { LifeBuoy, Search, Filter, Eye, CheckCircle, Clock, XCircle, Send, MessageSquare, Trash2, AlertTriangle, Image } from 'lucide-react';
import { useSupportTicketStore } from '../store/supportTicketStore';
import { useAuthStore } from '../store/authStore';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { formatDateWithTime } from '../utils/dateUtils';

const SupportTicketsPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    tickets,
    selectedTicket,
    ticketMessages,
    isLoading,
    isDeleting,
    isLoadingMessages,
    fetchTickets,
    markTicketAsOpened,
    updateTicketStatus,
    deleteTicket,
    fetchTicketMessages,
    addTicketMessage,
    setSelectedTicket
  } = useSupportTicketStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.user?.email && ticket.user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ticket.tournament?.title && ticket.tournament.title.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter ? ticket.status === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  const handleViewTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    setIsTicketModalOpen(true);
    await markTicketAsOpened(ticket.id);
    await fetchTicketMessages(ticket.id);
  };

  const handleStatusChange = async (status: 'open' | 'in_progress' | 'closed') => {
    if (!selectedTicket) return;
    await updateTicketStatus(selectedTicket.id, status);
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicket) return;

    await deleteTicket(selectedTicket.id);
    setIsDeleteConfirmOpen(false);
    setIsTicketModalOpen(false);
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    setIsSendingMessage(true);
    try {
      await addTicketMessage(selectedTicket.id, newMessage, true);
      setNewMessage('');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="warning">Open</Badge>;
      case 'in_progress':
        return <Badge variant="primary">In Progress</Badge>;
      case 'closed':
        return <Badge variant="success">Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-5 w-5 text-gray-400" />}
          />
        </div>

        <div className="w-48 ml-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'closed', label: 'Closed' }
            ]}
            leftIcon={<Filter className="h-5 w-5 text-gray-400" />}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <LifeBuoy className="h-5 w-5 text-primary-500 mr-2" />
            Support Tickets
          </CardTitle>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <LifeBuoy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No support tickets found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Tournament</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className={!ticket.first_opened_at ? 'bg-primary-50 dark:bg-primary-950/20' : ''}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {ticket.subject}
                        {!ticket.first_opened_at && (
                          <Badge variant="error" className="text-xs">New</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{ticket.user?.email || 'Unknown'}</TableCell>
                    <TableCell>{ticket.tournament?.title || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>{formatDateWithTime(ticket.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewTicket(ticket)}
                      >
                        <Eye size={16} className="mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Modal */}
      <Modal
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false);
          setSelectedTicket(null);
        }}
        title={selectedTicket ? `Ticket: ${selectedTicket.subject}` : 'Ticket Details'}
        size="lg"
      >
        {selectedTicket && (
          <div className="space-y-6">
            {/* Ticket Information */}
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-white">{selectedTicket.subject}</h3>
                  <p className="text-sm text-gray-400">
                    From: {selectedTicket.user?.email || 'Unknown User'}
                    {selectedTicket.user?.username && ` (${selectedTicket.user.username})`}
                  </p>
                </div>
                <div>
                  {getStatusBadge(selectedTicket.status)}
                </div>
              </div>

              <div className="bg-dark-200 p-4 rounded-lg">
                <div className="text-white">
                  {/* Check if description contains an image URL */}
                  {selectedTicket.description.match(/https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)/i) ? (
                    <div className="space-y-2">
                      <p className="whitespace-pre-line">
                        {selectedTicket.description.replace(/https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)/i, '')}
                      </p>
                      {selectedTicket.description.match(/https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)/i)?.map((url, index) => (
                        <div key={index} className="mt-2">
                          <div className="bg-dark-100 p-1 rounded-md inline-flex items-center mb-1">
                            <Image size={14} className="mr-1 text-primary-400" />
                            <span className="text-xs text-gray-300">Attached Image</span>
                          </div>
                          <img
                            src={url}
                            alt="User uploaded"
                            className="max-w-full rounded-md border border-dark-100 max-h-64 object-contain"
                            onClick={() => window.open(url, '_blank')}
                            style={{ cursor: 'pointer' }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="whitespace-pre-line">{selectedTicket.description}</p>
                  )}
                </div>
              </div>
              {selectedTicket.tournament && (
                <div className="bg-dark-200 p-3 rounded-lg">
                  <p className="text-sm text-gray-400">Related Tournament:</p>
                  <p className="text-white">{selectedTicket.tournament.title}</p>
                </div>
              )}

              <div className="flex justify-between text-sm text-gray-400">
                <span>Created: {formatDateWithTime(selectedTicket.created_at)}</span>
                <span>Last Updated: {formatDateWithTime(selectedTicket.updated_at)}</span>
              </div>
            </div>

            {/* Status Controls */}
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="danger"
                onClick={() => setIsDeleteConfirmOpen(true)}
                leftIcon={<Trash2 size={16} />}
              >
                Delete Ticket
              </Button>
              <div className="flex-1"></div>
              <Button
                size="sm"
                variant={selectedTicket.status === 'open' ? 'primary' : 'ghost'}
                onClick={() => handleStatusChange('open')}
                leftIcon={<Clock size={16} />}
                disabled={selectedTicket.status === 'open'}
              >
                Open
              </Button>
              <Button
                size="sm"
                variant={selectedTicket.status === 'in_progress' ? 'primary' : 'ghost'}
                onClick={() => handleStatusChange('in_progress')}
                leftIcon={<MessageSquare size={16} />}
                disabled={selectedTicket.status === 'in_progress'}
              >
                In Progress
              </Button>
              <Button
                size="sm"
                variant={selectedTicket.status === 'closed' ? 'primary' : 'ghost'}
                onClick={() => handleStatusChange('closed')}
                leftIcon={<CheckCircle size={16} />}
                disabled={selectedTicket.status === 'closed'}
              >
                Closed
              </Button>
            </div>

            {/* Messages */}
            <div>
              <h4 className="text-md font-medium text-white mb-3">Conversation</h4>

              {isLoadingMessages ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : ticketMessages.length === 0 ? (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <p>No messages yet</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto p-2">
                  {ticketMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg ${
                        message.is_admin_message
                          ? 'bg-primary-900/20 border border-primary-500/30 ml-8'
                          : 'bg-dark-200 mr-8'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-sm font-medium text-white">
                          {message.is_admin_message ? 'Admin' : message.user?.username || message.user?.email || 'User'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDateWithTime(message.created_at)}
                        </div>
                      </div>
                      <div className="text-white">
                        {/* Check if message contains an image URL */}
                        {message.message.match(/https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)/i) ? (
                          <div className="space-y-2">
                            <p className="whitespace-pre-line">
                              {message.message.replace(/https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)/i, '')}
                            </p>
                            {message.message.match(/https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)/i)?.map((url, index) => (
                              <div key={index} className="mt-2">
                                <div className="bg-dark-100 p-1 rounded-md inline-flex items-center mb-1">
                                  <Image size={14} className="mr-1 text-primary-400" />
                                  <span className="text-xs text-gray-300">Attached Image</span>
                                </div>
                                <img
                                  src={url}
                                  alt="User uploaded"
                                  className="max-w-full rounded-md border border-dark-100 max-h-64 object-contain"
                                  onClick={() => window.open(url, '_blank')}
                                  style={{ cursor: 'pointer' }}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="whitespace-pre-line">{message.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form */}
              <div className="mt-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Type your reply..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    isLoading={isSendingMessage}
                    disabled={!newMessage.trim()}
                    leftIcon={<Send size={16} />}
                  >
                    Send
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Your reply will be sent as an admin message.
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Confirm Deletion"
        size="md"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteTicket}
              isLoading={isDeleting}
              leftIcon={<Trash2 size={16} />}
            >
              Delete Ticket
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-error-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-medium text-white">Are you sure you want to delete this ticket?</h3>
              <p className="text-gray-400 mt-1">
                This action will permanently delete the ticket and all associated messages. This cannot be undone.
              </p>
            </div>
          </div>

          {selectedTicket && (
            <div className="bg-dark-200 p-3 rounded-md">
              <p className="text-sm text-gray-400">Ticket Subject:</p>
              <p className="font-medium text-white">{selectedTicket.subject}</p>
              <p className="text-sm text-gray-400 mt-2">From:</p>
              <p className="text-white">{selectedTicket.user?.email || 'Unknown User'}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default SupportTicketsPage;
