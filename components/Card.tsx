
import React, { ReactNode, HTMLAttributes } from 'react';

// FIX: Update CardProps to extend HTMLAttributes<HTMLDivElement> to allow passing standard HTML attributes like onClick.
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
