import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLocalization } from '../hooks/useLocalization';
import { api } from '../services/api';
import { Supplier } from '../types';
import Spinner from '../components/Spinner';
import Card from '../components/Card';
import { Star, Phone, Mail } from 'lucide-react';

const SupplierDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocalization();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.fetchSupplierById(id).then(data => {
        setSupplier(data || null);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) return <Spinner />;
  if (!supplier) return <div>Supplier not found</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{supplier.name}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">INN: {supplier.inn}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <h2 className="text-xl font-semibold mb-4">Supplier Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p><strong>Contact Person:</strong></p>
              <p>{supplier.contactPerson}</p>
              <p><strong><Phone className="inline h-4 w-4 mr-1"/> Phone:</strong></p>
              <p>{supplier.phone}</p>
              <p><strong><Mail className="inline h-4 w-4 mr-1"/> Email:</strong></p>
              <p>{supplier.email}</p>
              <p><strong><Star className="inline h-4 w-4 mr-1"/> Rating:</strong></p>
              <p>{supplier.rating} / 5.0</p>
            </div>
          </Card>
        </div>
        <div className="space-y-6">
            <Card>
                <h3 className="text-lg font-semibold mb-3">Participation History</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">No participation history available.</p>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default SupplierDetail;
