import { useState } from 'react';
import qrcode from './assets/images/tari-qr.png';
import tariLogo from './assets/images/tari-logo.png';
import './TariConnectorButton.css';

interface TariConnectorButtonProps {
  fullWidth?: boolean;
}

function TariConnectorButton({ fullWidth }: TariConnectorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [fadeClass, setFadeClass] = useState('taricb-fade-in');

  const openPopup = () => {
    setIsOpen(true);
    setFadeClass('taricb-fade-in');
  };

  const closePopup = () => {
    setFadeClass('taricb-fade-out');
    setTimeout(() => {
      setIsOpen(false);
      setFadeClass('taricb-fade-in');
    }, 300);
  };

  const handleBackgroundClick = (event: any) => {
    if (event.target.className === `taricb-popup-box ${fadeClass}`) {
      closePopup();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText('tari://localhost');
    setIsCopied(true);
    setFadeClass('');
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const Popup = ({ content }: any) => {
    return (
      <div
        className={`taricb-popup-box ${fadeClass}`}
        onClick={handleBackgroundClick}
      >
        <div className="taricb-box">{content}</div>
      </div>
    );
  };

  const CheckMark = () => {
    return (
      <div className="taricb-checkmark-container">
        <svg
          className="taricb-checkmark"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 52 52"
        >
          <circle
            className="taricb-checkmark__circle"
            cx="26"
            cy="26"
            r="25"
            fill="none"
          />
          <path
            className="taricb-checkmark__check"
            fill="none"
            d="M14.1 27.2l7.1 7.2 16.7-16.8"
          />
        </svg>
      </div>
    );
  };

  return (
    <>
      <button
        className="taricb-btn taricb-primary-btn"
        onClick={openPopup}
        style={fullWidth ? { width: '100%' } : { width: 'auto' }}
      >
        Connect
      </button>
      {isOpen && (
        <Popup
          content={
            <div className="taricb-popup-container">
              <img src={tariLogo} alt="tari logo" className="taricb-logo" />
              <p className="taricb-text">
                Scan the QR code or copy the link below to connect your wallet
              </p>
              <img src={qrcode} alt="qr code" className="taricb-qr" />
              <div className="taricb-btn-container">
                <button
                  className="taricb-btn taricb-primary-btn"
                  onClick={handleCopy}
                >
                  {isCopied ? <CheckMark /> : 'Copy Link'}
                </button>
                <button
                  className="taricb-btn taricb-secondary-btn"
                  onClick={closePopup}
                >
                  Close
                </button>
              </div>
            </div>
          }
          handleClose={closePopup}
        />
      )}
    </>
  );
}

export default TariConnectorButton;
