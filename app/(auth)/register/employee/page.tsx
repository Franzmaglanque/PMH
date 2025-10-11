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
  Select,
} from '@mantine/core';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { employeeRegistrationSchema, EmployeeRegistrationInput } from '../../../../lib/schemas/auth.schema';
import { notifications } from '@mantine/notifications';

export default function EmployeeRegisterPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<EmployeeRegistrationInput>({
    resolver: zodResolver(employeeRegistrationSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      category: '',
      position: '',
    },
  });

  const onSubmit = async (values: EmployeeRegistrationInput) => {
    setLoading(true);
    
    try {
      // Prepare the employee registration data for your Laravel API
      // Notice how we're explicitly setting position based on what's in the form
      // and we're NOT including any supplier-specific fields at all
      const registrationData = {
        email: values.email,
        password: values.password,
        password_confirmation: values.confirmPassword,
        first_name: values.firstName,
        last_name: values.lastName,
        category: values.category,
        position: values.position,
      };

      console.log('Sending employee registration data:', registrationData);

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
          message: 'Your employee account has been created. Redirecting to login...',
          color: 'green',
          autoClose: 3000,
        });

        // If the API returns a token, store it and redirect to the main app
        // This provides a seamless experience where users don't need to log in after registering
        if (data.token) {
          localStorage.setItem('token', data.token);
          setTimeout(() => {
            router.push('/batch');
          }, 1500);
        } else {
          // Otherwise, redirect them to the login page
          setTimeout(() => {
            router.push('/login');
          }, 1500);
        }
      } else {
        // Handle validation errors from the Laravel backend
        // Laravel returns errors in a specific format that we need to transform
        if (data.errors) {
          Object.keys(data.errors).forEach((key) => {
            // Convert Laravel's snake_case field names to our camelCase form field names
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
        Employee Registration
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Already have an account?{' '}
        <Anchor size="sm" href="/login">
          Sign in
        </Anchor>
      </Text>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Are you a supplier?{' '}
        <Anchor size="sm" href="/register/supplier">
          Register as supplier
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
              placeholder="you@company.com"
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
              Employment Details
            </Title>

            <TextInput
              label="Category"
              placeholder="e.g., IT, Operations, Finance"
              required
              description="Your department or category"
              {...register('category')}
              error={errors.category?.message}
            />

            <Controller
              name="position"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Select
                  label="Position"
                  placeholder="Select your position"
                  required
                  data={[
                    { value: 'MERCHANDISING', label: 'Merchandising' },
                    { value: 'MASTERDATA', label: 'Master Data' },
                  ]}
                  value={value}
                  onChange={onChange}
                  error={errors.position?.message}
                />
              )}
            />

            <Button type="submit" fullWidth loading={loading} mt="lg">
              Create Employee Account
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}