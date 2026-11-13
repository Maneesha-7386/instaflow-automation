import React from 'react';
import Modal from '../common/Modal';
import ConnectInstagramOnboarding from '../onboarding/ConnectInstagramOnboarding';

export default function ConnectAccountModal({ isOpen, onClose }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect Instagram Account"
      maxWidth="max-w-[520px]"
    >
      <ConnectInstagramOnboarding isModalMode={true} onClose={onClose} />
    </Modal>
  );
}
