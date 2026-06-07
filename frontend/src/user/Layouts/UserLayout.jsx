import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../Components/Headers/Navbar'
import Footer from '../Components/Footers/Footer'
import './layout.css'
export default function UserLayout() {
  return (
    <div>
      <Navbar />
      <main className='main-content'>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
