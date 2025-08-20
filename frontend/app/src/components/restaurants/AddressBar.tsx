import { Link } from 'react-router-dom';
import { useAddressStore } from '../../store/addressStore';

const AddressBar = () => {
  const { addresses, selectedAddress, setDefaultAddress, isLoading } = useAddressStore();

  const handleAddressChange = (addressId: number) => {
    setDefaultAddress(addressId);
  };

  if (isLoading) {
    return <div className="bg-white p-4 rounded-lg shadow text-center">جارٍ تحميل العناوين...</div>;
  }

  if (addresses.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center">
        <h2 className="text-xl font-bold">أين تود استلام طلبك؟</h2>
        <p className="text-gray-600 my-2">ابدأ بإضافة عنوانك لرؤية المطاعم التي توصل إليك.</p>
        <Link
          to="/addresses"
          className="mt-2 inline-block bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700"
        >
          إضافة عنوان جديد
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
      <div>
        <span className="font-semibold">التوصيل إلى:</span>
        <select
          value={selectedAddress?.id || ''}
          onChange={(e) => handleAddressChange(parseInt(e.target.value))}
          className="bg-transparent font-bold text-indigo-600 border-none focus:ring-0"
        >
          {addresses.map((address) => (
            <option key={address.id} value={address.id}>
              {address.name} ({address.address_line})
            </option>
          ))}
        </select>
      </div>
      <Link to="/addresses" className="text-sm font-medium text-indigo-600 hover:underline">
        إدارة العناوين
      </Link>
    </div>
  );
};

export default AddressBar;