import * as React from 'react'
import { useState } from 'react';
import tariLogo from './assets/images/tari-logo.png';
import styles from './TariConnectorButton.module.css';
import initTariConnection, { TariConnection } from '../webrtc';
import { QRCodeSVG } from 'qrcode.react';

export interface TariConnectorButtonProps {
  fullWidth?: boolean;
  background?: string;
  textColor?: string;
  onOpen?: (tari: TariConnection) => void;
}

function TariConnectorButton({
  fullWidth,
  background = '#9330FF',
  textColor = '#FFFFFF',
  onOpen,
}: TariConnectorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [fadeClass, setFadeClass] = useState('tariFadeIn');
  const [tokenUrl, setTokenUrl] = useState("");
  // console.log('onOpen', onOpen);

  const openPopup = () => {
    setIsOpen(true);
    setFadeClass('tariFadeIn');
    initTariConnection().then((tari) => {
      onOpen?.(tari);
      if (tari.token) {
        setTokenUrl(`tari://${tari.token}`);
      }
    });
  };

  const closePopup = () => {
    setFadeClass('tariFadeOut');
    setTimeout(() => {
      setIsOpen(false);
      setFadeClass('tariFadeIn');
    }, 300);
  };

  const handleBackgroundClick = (event: any) => {
    if (event.target.className.includes('tariPopupBox')) {
      closePopup();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(tokenUrl);
    setIsCopied(true);
    setFadeClass('');
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const Popup = ({ content }: any) => {
    return (
      <div
        className={[styles.tariPopupBox, styles[fadeClass]].join(' ')}
        onClick={handleBackgroundClick}
      >
        <div className={styles.tariBox}>{content}</div>
      </div>
    );
  };

  const CheckMark = () => {
    return (
      <svg
        className={styles.tariCheckmark}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 52 52"
      >
        <circle
          className={styles.tariCheckmarkCircle}
          cx="26"
          cy="26"
          r="25"
          fill="none"
        />
        <path
          className={styles.tariCheckmarkCheck}
          fill="none"
          d="M14.1 27.2l7.1 7.2 16.7-16.8"
        />
      </svg>
    );
  };

  return (
    <>
      <button
        className={[styles.tariBtn, styles.tariPrimaryBtn].join(' ')}
        onClick={openPopup}
        style={{
          width: fullWidth ? '100%' : 'auto',
          backgroundColor: background,
          color: textColor,
        }}
      >
        Connect
      </button>
      {isOpen && (
        <Popup
          content={
            <div className={styles.tariPopupContainer}>
              <img src={tariLogo} alt="tari logo" className={styles.tariLogo} />
              <p className={styles.tariText}>
                Scan the QR code or copy the link below to connect your wallet
              </p>
              <QRCodeSVG value={tokenUrl} />
              <div className={styles.tariBtnContainer}>
                <button
                  className={[styles.tariBtn, styles.tariPrimaryBtn].join(' ')}
                  onClick={handleCopy}
                >
                  {isCopied ? <CheckMark /> : 'Copy Link'}
                </button>
                <button
                  className={[styles.tariBtn, styles.tariSecondaryBtn].join(
                    ' '
                  )}
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
