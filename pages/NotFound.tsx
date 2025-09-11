
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-6xl font-bold text-indigo-600">404</h1>
      <h2 className="mt-4 text-3xl font-bold text-gray-800 dark:text-white">Страница не найдена</h2>
      <p className="mt-2 text-gray-600 dark:text-gray-400">Извините, мы не можем найти страницу, которую вы ищете.</p>
      <Link
        to="/dashboard"
        className="mt-6 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
      >
        Вернуться на главную
      </Link>
    </div>
  );
};

export default NotFound;
