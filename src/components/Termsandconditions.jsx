import React from 'react';

const TermsAndConditions = () => {
  const terms = [
    'Payment: 70% Advance, 30% on Delivery',
    'Delivery: 15 - 20 days from the day of Advance',
    'Validity: 15 Days from the date of Proposal',
    'Warranty: As per Manufacture\'s terms',
    'Good\'s once sold cannot be returned or exchanged.',
    'In case payment is not made within the agreed terms, 3% P.M interest compound will be charged on due payment.'
  ];

  return (
    <div className="card mt-6">
      <div className="card-header">
        <h3 className="text-base font-semibold text-gray-900">Terms and Conditions</h3>
      </div>
      <div className="card-body">
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          {terms.map((term, index) => (
            <li key={index}>{term}</li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default TermsAndConditions;