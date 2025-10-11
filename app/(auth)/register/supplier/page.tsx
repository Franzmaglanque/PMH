'use client';

import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Container,
  Stack,
  SimpleGrid,
  Divider,
  Anchor,
} from '@mantine/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supplierRegistrationSchema, SupplierRegistrationInput } from '../../../../lib/schemas/auth.schema';
import { notifications } from '@mantine/notifications';

export default function SupplierRegisterPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SupplierRegistrationInput>({
    resolver: zodResolver(supplierRegistrationSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      supplierCode: '',
    },
  });

  const onSubmit = async (values: SupplierRegistrationInput) => {
    setLoading(true);
    
    try {
      // Prepare the supplier registration data for your Laravel API
      // For suppliers, we automatically set the position to 'supplier'
      // and the category to 'supplier' as specified in your requirements
      const registrationData = {
        email: values.email,
        password: values.password,
        password_confirmation: values.confirmPassword,
        first_name: values.firstName,
        last_name: values.lastName,
        supplier_code: values.supplierCode,
        position: 'supplier',
        category: 'supplier',
      };

      console.log('Sending supplier registration data:', registrationData);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();
      console.log('Registration response:', data);

      if (response.ok) {
        notifications.show({
          title: 'Registration Successful!',
          message: 'Your supplier account has been created. Redirecting to login...',
          color: 'green',
          autoClose: 3000,
        });

        if (data.token) {
          localStorage.setItem('token', data.token);
          setTimeout(() => {
            router.push('/batch');
          }, 1500);
        } else {
          setTimeout(() => {
            router.push('/login');
          }, 1500);
        }
      } else {
        if (data.errors) {
          Object.keys(data.errors).forEach((key) => {
            const formKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            setError(formKey as any, {
              type: 'manual',
              message: data.errors[key][0],
            });
          });

          notifications.show({
            title: 'Registration Failed',
            message: 'Please check the form for errors.',
            color: 'red',
            autoClose: 5000,
          });
        } else {
          notifications.show({
            title: 'Registration Failed',
            message: data.message || 'Something went wrong. Please try again.',
            color: 'red',
            autoClose: 5000,
          });
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      notifications.show({
        title: 'Network Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
        color: 'red',
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={500} my={40}>
      <Title ta="center" fw={900} style={{ fontSize: '2rem' }}>
        Supplier Registration
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Already have an account?{' '}
        <Anchor size="sm" href="/login">
          Sign in
        </Anchor>
      </Text>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Are you an employee?{' '}
        <Anchor size="sm" href="/register/employee">
          Register as employee
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack gap="md">
            <Title order={4} size="h5" c="dimmed">
              Personal Information
            </Title>

            <TextInput
              label="Email"
              placeholder="you@supplier.com"
              type="email"
              required
              {...register('email')}
              error={errors.email?.message}
            />

            <SimpleGrid cols={2}>
              <TextInput
                label="First Name"
                placeholder="John"
                required
                {...register('firstName')}
                error={errors.firstName?.message}
              />

              <TextInput
                label="Last Name"
                placeholder="Doe"
                required
                {...register('lastName')}
                error={errors.lastName?.message}
              />
            </SimpleGrid>

            <Divider my="xs" />

            <Title order={4} size="h5" c="dimmed">
              Security
            </Title>

            <PasswordInput
              label="Password"
              placeholder="Your password"
              required
              description="Must be at least 8 characters with uppercase, lowercase, and numbers"
              {...register('password')}
              error={errors.password?.message}
            />

            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm your password"
              required
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
            />

            <Divider my="xs" />

            <Title order={4} size="h5" c="dimmed">
              Supplier Information
            </Title>

            <TextInput
              label="Supplier Code"
              placeholder="SUP-001"
              required
              description="Your unique supplier identification code"
              {...register('supplierCode')}
              error={errors.supplierCode?.message}
            />

            <Text size="xs" c="dimmed">
              Note: Your position will automatically be set to "Supplier"
            </Text>

            <Button type="submit" fullWidth loading={loading} mt="lg">
              Create Supplier Account
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}