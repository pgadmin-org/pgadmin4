def test():
    try:
        return 1
    except Exception as e:
        return 2
    finally:
        return 3
        print(222)

if __name__ == '__main__':
    print(test())
