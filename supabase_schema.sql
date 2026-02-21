-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create businesses table
create table public.businesses (
  id text primary key,
  name text not null,
  owner_id uuid references auth.users(id),
  subscription_plan text default 'Free Trial',
  subscription_status text default 'trial',
  trial_ends_at timestamp with time zone,
  max_branches integer default 1,
  max_staff integer default 5,
  currency text default 'KES',
  country text default 'Kenya',
  timezone text default 'Africa/Nairobi',
  business_type text,
  working_hours jsonb,
  tax_config jsonb,
  branding jsonb,
  completed_onboarding boolean default false,
  created_at timestamp with time zone default now()
);

-- Create profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) primary key,
  email text,
  first_name text,
  last_name text,
  role text,
  role_id text,
  business_id text references public.businesses(id),
  branch_id text, -- link to branches table if created
  must_change_password boolean default false,
  can_create_expense boolean default false,
  created_at timestamp with time zone default now()
);

-- Create branches table (optional for now but referenced in code)
create table public.branches (
  id text primary key,
  business_id text references public.businesses(id),
  name text,
  status text default 'active',
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.branches enable row level security;

-- Create policies (Simplified for development)
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Business owners can view their business" on public.businesses
  for select using (owner_id = auth.uid());
