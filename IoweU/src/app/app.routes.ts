import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.page').then( m => m.RegisterPage)
  },
  {
    path: 'group-overview',
    loadComponent: () => import('./group-overview/group-overview.page').then( m => m.GroupOverviewPage)
  },
  {
    path: 'create-group',
    loadComponent: () => import('./create-group/create-group.page').then( m => m.CreateGroupPage)
  },
  {
    path: 'group',
    loadComponent: () => import('./group/group.page').then( m => m.GroupPage)
  },
  {
    path: 'finance',
    loadComponent: () => import('./finance/finance.page').then( m => m.FinancePage)
  },





];
