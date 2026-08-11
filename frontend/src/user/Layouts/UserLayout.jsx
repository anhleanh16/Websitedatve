import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Navbar from '../Components/Headers/Navbar'
import Footer from '../Components/Footers/Footer'
import './layout.css'
export default function UserLayout() {
  const profile = useSelector((state) => state.user.profile)
  const location = useLocation()

  if (profile?.must_change_password === true && location.pathname !== '/create-password') {
    return <Navigate to='/create-password' replace />
  }

  return (
    <div className='user-layout'>
      <div className='site-web-decoration' aria-hidden='true'>
        <span className='site-web site-web-top-left' />
        <span className='site-web site-web-top-right' />
        <span className='site-web site-web-bottom-right' />
      </div>
      <Navbar />
      <main className='main-content'>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
