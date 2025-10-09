// components/Layout/MainLayout.jsx

import React from 'react';
import HeaderMenu from '../Menu/HeaderMenu';

export default function MainLayout({ children }: React.PropsWithChildren) {
  return (
    <>
      <HeaderMenu />
      {/* This is where the content of your page (e.g., your home page, about page) 
        will be rendered.
      */}
      <main>
        {children}
      </main>
      {/* Optional: Add a Footer component here if you have one */}
    </>
  );
}