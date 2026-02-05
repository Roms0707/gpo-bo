import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

const Table: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full divide-y divide-gray-200 dark:divide-dark-200 ${className}`}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <thead className={`bg-gray-50 dark:bg-dark-200 ${className}`}>
      {children}
    </thead>
  );
};

export const TableBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <tbody className={`divide-y divide-gray-200 dark:divide-dark-300 bg-white dark:bg-dark-300 ${className}`}>
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  isHighlighted?: boolean;
}> = ({ 
  children, 
  className = '',
  isHighlighted = false,
}) => {
  return (
    <tr className={`
      ${isHighlighted ? 'bg-accent-50 dark:bg-accent-900/20' : 'hover:bg-gray-50 dark:hover:bg-dark-200'}
      ${className}
    `}>
      {children}
    </tr>
  );
};

export const TableHead: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => {
  return (
    <th
      scope="col"
      className={`px-2 sm:px-3 md:px-4 lg:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
};

export const TableCell: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => {
  return (
    <td className={`px-2 sm:px-3 md:px-4 lg:px-6 py-2 md:py-3 text-sm text-gray-900 dark:text-white ${className}`}>
      {children}
    </td>
  );
};

export default Table;